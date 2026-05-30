import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createBiteshipOrder } from "@/lib/biteship/create-order";
import { createNotification } from "@/lib/notifications/create-notification";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";

type MidtransStatusResponse = {
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
  va_numbers?: { bank: string; va_number: string }[];
  payment_code?: string;
  pdf_url?: string;
  expiry_time?: string;
};

async function getMidtransStatus(orderNumber: string): Promise<MidtransStatusResponse | null> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!serverKey) return null;

  const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const base = isProd ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
  const credentials = Buffer.from(`${serverKey}:`).toString("base64");

  try {
    const res = await fetch(`${base}/v2/${encodeURIComponent(orderNumber)}/status`, {
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as MidtransStatusResponse;
  } catch {
    return null;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params;

    const auth = await createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Fetch order — must belong to this user
    const { data: order } = await auth
      .from("orders")
      .select("id, order_number, status, user_id")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!order) {
      return Response.json({ success: false, error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    // Already updated — return early
    if (order.status !== "pending_payment") {
      return Response.json({ success: true, data: { status: order.status } });
    }

    const mtStatus = await getMidtransStatus(order.order_number);
    if (!mtStatus) {
      return Response.json({ success: false, error: "Tidak dapat memverifikasi pembayaran." }, { status: 502 });
    }

    const txStatus = mtStatus.transaction_status;
    const fraudStatus = mtStatus.fraud_status;

    if (
      (txStatus !== "settlement" && txStatus !== "capture") ||
      fraudStatus === "deny"
    ) {
      return Response.json({ success: false, error: "Pembayaran belum dikonfirmasi." }, { status: 400 });
    }

    const svc = createServiceClient();

    await svc.from("orders").update({ status: "paid" }).eq("id", order.id);

    await svc.from("order_status_history").insert({
      order_id: order.id,
      status: "paid",
      note: `Pembayaran dikonfirmasi via Midtrans (${mtStatus.payment_type ?? ""})`,
      changed_by: null,
    });

    await createNotification({
      userId: order.user_id ?? "",
      title: "Pembayaran Dikonfirmasi",
      body: `Pembayaran untuk pesanan ${order.order_number} berhasil dikonfirmasi. Pesanan sedang diproses.`,
      type: "payment_confirmed",
      data: { orderId: order.id, orderNumber: order.order_number },
    });

    await createAdminNotification({
      title: "Pembayaran Diterima",
      body: `Pesanan ${order.order_number} telah dibayar. Siap untuk diproses.`,
      type: "payment_confirmed",
      data: { orderId: order.id, orderNumber: order.order_number },
    });

    const vaNumber = mtStatus.va_numbers?.[0]?.va_number ?? null;
    await svc
      .from("payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        midtrans_transaction_id: mtStatus.transaction_id ?? null,
        va_number: vaNumber,
        payment_code: mtStatus.payment_code ?? null,
        pdf_url: mtStatus.pdf_url ?? null,
        expiry_time: mtStatus.expiry_time ?? null,
      })
      .eq("midtrans_order_id", order.order_number)
      .neq("status", "paid");

    // Deduct stock and clear reservation
    const { data: items } = await svc
      .from("order_items")
      .select("variant_id, quantity")
      .eq("order_id", order.id);

    if (items) {
      const productQtyMap = new Map<string, number>();

      for (const item of items) {
        if (!item.variant_id) continue;
        const { data: v } = await svc
          .from("product_variants")
          .select("stock, reserved, product_id")
          .eq("id", item.variant_id)
          .single();
        if (!v) continue;
        const newStock = Math.max(0, v.stock - item.quantity);
        await svc
          .from("product_variants")
          .update({
            stock: newStock,
            reserved: Math.max(0, v.reserved - item.quantity),
          })
          .eq("id", item.variant_id);
        if (newStock <= 5) {
          await createAdminNotification({
            title: "Stok Menipis",
            body: `Variant ${item.variant_id} tersisa ${newStock} unit setelah pesanan ${order.order_number}.`,
            type: "low_stock",
            data: { variantId: item.variant_id, stock: newStock, orderId: order.id },
          });
        }
        await svc.from("stock_history").insert({
          variant_id: item.variant_id,
          order_id: order.id,
          quantity: -item.quantity,
          type: "sale",
          note: `Pesanan ${order.order_number} settlement`,
          changed_by: null,
        });
        if (v.product_id) {
          productQtyMap.set(v.product_id, (productQtyMap.get(v.product_id) ?? 0) + item.quantity);
        }
      }

      for (const [productId, qty] of productQtyMap) {
        const { data: p } = await svc
          .from("products")
          .select("total_sold")
          .eq("id", productId)
          .single();
        if (p) {
          await svc
            .from("products")
            .update({ total_sold: p.total_sold + qty })
            .eq("id", productId);
        }
      }
    }

    // Create Biteship shipment — only on first settlement transition
    const { data: existingShipment } = await svc
      .from("shipments")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle();

    if (!existingShipment) {
      const { data: orderFull } = await svc
        .from("orders")
        .select("courier_company, courier_service, recipient_name, recipient_phone, shipping_address, shipping_postal")
        .eq("id", order.id)
        .single();

      if (orderFull?.courier_company && orderFull.courier_service) {
        const { data: orderItems } = await svc
          .from("order_items")
          .select("product_name, price, quantity, weight")
          .eq("order_id", order.id);

        if (orderItems?.length) {
          const postalNum = parseInt(orderFull.shipping_postal.replace(/\D/g, ""), 10);
          const shipResult = await createBiteshipOrder({
            destinationName: orderFull.recipient_name,
            destinationPhone: orderFull.recipient_phone,
            destinationAddress: orderFull.shipping_address,
            destinationPostalCode: postalNum,
            courierCompany: orderFull.courier_company,
            courierType: orderFull.courier_service,
            items: orderItems.map((i) => ({
              name: i.product_name,
              value: i.price,
              quantity: i.quantity,
              weight: Math.round(i.weight / i.quantity),
            })),
            orderNote: `GeekyTech Order ${order.order_number}`,
          });

          if (shipResult.ok) {
            await svc.from("shipments").insert({
              order_id: order.id,
              courier_company: orderFull.courier_company,
              courier_name: shipResult.courierName,
              courier_service: orderFull.courier_service,
              biteship_order_id: shipResult.biteshipOrderId,
              awb: shipResult.awb,
              status: "pending",
            });
          } else {
            await svc.from("order_status_history").insert({
              order_id: order.id,
              status: "paid",
              note: `Biteship gagal: ${shipResult.error}`,
              changed_by: null,
            });
          }
        }
      }
    }

    return Response.json({ success: true, data: { status: "paid" } });
  } catch {
    return Response.json({ success: false, error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
