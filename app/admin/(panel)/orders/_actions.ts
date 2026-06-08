"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { getBiteshipOrder } from "@/lib/biteship/get-order";
import { ORDER_STATUSES, type OrderStatus } from "./_constants";

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<{ error?: string }> {
  if (!(ORDER_STATUSES as readonly string[]).includes(newStatus)) {
    return { error: "Status tidak valid." };
  }

  const supabase = await createServiceClient();

  const { data: currentOrder } = await supabase
    .from("orders")
    .select("status, user_id, order_number")
    .eq("id", orderId)
    .single();

  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (error) return { error: error.message };

  // Notify customer on relevant status changes
  if (currentOrder?.user_id && currentOrder?.order_number) {
    const orderNum = currentOrder.order_number as string;
    const userId = currentOrder.user_id as string;
    const notifMap: Partial<Record<OrderStatus, { title: string; body: string }>> = {
      processing: {
        title: "Pesanan Diproses",
        body: `Pesanan ${orderNum} sedang diproses oleh penjual.`,
      },
      shipped: {
        title: "Pesanan Sedang Dikirim",
        body: `Pesanan ${orderNum} telah dikirim. Cek nomor resi di detail pesanan untuk melacak paket Anda.`,
      },
      delivered: {
        title: "Pesanan Telah Sampai",
        body: `Pesanan ${orderNum} telah sampai di tujuan.`,
      },
      completed: {
        title: "Pesanan Selesai",
        body: `Pesanan ${orderNum} telah selesai. Terima kasih telah berbelanja!`,
      },
      cancelled: {
        title: "Pesanan Dibatalkan",
        body: `Pesanan ${orderNum} telah dibatalkan.`,
      },
      refunded: {
        title: "Pesanan Direfund",
        body: `Refund untuk pesanan ${orderNum} sedang diproses.`,
      },
    };
    const notif = notifMap[newStatus];
    if (notif) {
      await createNotification({
        userId,
        title: notif.title,
        body: notif.body,
        type: "order_update",
        data: { order_id: orderId, order_number: orderNum, status: newStatus },
      });
    }
  }

  // Jika dibatalkan setelah pembayaran settlement, kembalikan stok & kurangi total_sold
  const prevStatus = currentOrder?.status;
  const wasAlreadyPaid = prevStatus === "paid" || prevStatus === "processing";
  if (newStatus === "cancelled" && wasAlreadyPaid) {
    const { data: items } = await supabase
      .from("order_items")
      .select("variant_id, quantity")
      .eq("order_id", orderId);

    if (items) {
      const productQtyMap = new Map<string, number>();

      for (const item of items) {
        if (!item.variant_id) continue;
        const { data: v } = await supabase
          .from("product_variants")
          .select("stock, product_id")
          .eq("id", item.variant_id)
          .single();
        if (!v) continue;
        await supabase
          .from("product_variants")
          .update({ stock: v.stock + item.quantity })
          .eq("id", item.variant_id);
        if (v.product_id) {
          productQtyMap.set(v.product_id, (productQtyMap.get(v.product_id) ?? 0) + item.quantity);
        }
      }

      for (const [productId, qty] of productQtyMap) {
        const { data: p } = await supabase
          .from("products")
          .select("total_sold")
          .eq("id", productId)
          .single();
        if (p) {
          await supabase
            .from("products")
            .update({ total_sold: Math.max(0, p.total_sold - qty) })
            .eq("id", productId);
        }
      }
    }
  }

  const { error: historyError } = await supabase
    .from("order_status_history")
    .insert({
      order_id: orderId,
      status: newStatus,
      note: note?.trim() || null,
      changed_by: null,
    });

  if (historyError) console.error("history log failed:", historyError.message);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}

export async function syncBiteshipAWB(
  orderId: string,
): Promise<{ error?: string; awb?: string | null }> {
  const supabase = await createServiceClient();

  const { data: shipment } = await supabase
    .from("shipments")
    .select("id, biteship_order_id, awb")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!shipment?.biteship_order_id) {
    return { error: "Tidak ada Biteship Order ID untuk pesanan ini." };
  }

  const result = await getBiteshipOrder(shipment.biteship_order_id);
  if (!result.ok) return { error: result.error };

  const { order } = result;
  const awb = order.courier?.waybill_id ?? null;

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (order.status && order.status !== "pending") updatePayload.status = order.status;
  if (awb) updatePayload.awb = awb;
  if (order.courier?.name) updatePayload.courier_name = order.courier.name;

  await supabase.from("shipments").update(updatePayload).eq("id", shipment.id);

  revalidatePath(`/admin/orders/${orderId}`);
  return { awb };
}

export async function updateOrderAWB(
  orderId: string,
  awb: string
): Promise<{ error?: string }> {
  const trimmed = awb.trim();
  if (!trimmed) return { error: "Nomor AWB tidak boleh kosong." };

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("shipments")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("shipments")
      .update({ awb: trimmed })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { data: order } = await supabase
      .from("orders")
      .select("courier_company, courier_service")
      .eq("id", orderId)
      .single();

    const { error } = await supabase.from("shipments").insert({
      order_id: orderId,
      awb: trimmed,
      courier_company: order?.courier_company ?? "manual",
      courier_service: order?.courier_service ?? "manual",
      status: "confirmed",
    });
    if (error) return { error: error.message };
  }

  // Auto-advance to shipped if still processing
  const { data: orderData } = await supabase
    .from("orders")
    .select("status, user_id, order_number")
    .eq("id", orderId)
    .single();

  if (orderData?.status === "processing") {
    await supabase
      .from("orders")
      .update({ status: "shipped" })
      .eq("id", orderId);
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      status: "shipped",
      note: `AWB diinput manual: ${trimmed}`,
      changed_by: null,
    });
    if (orderData.user_id && orderData.order_number) {
      await createNotification({
        userId: orderData.user_id as string,
        title: "Pesanan Sedang Dikirim",
        body: `Pesanan ${orderData.order_number} telah dikirim. Lacak paket Anda dengan nomor resi ${trimmed}.`,
        type: "order_update",
        data: { order_id: orderId, order_number: orderData.order_number, status: "shipped", awb: trimmed },
      });
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}
