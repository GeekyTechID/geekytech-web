import "server-only";

import { after } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { createShipmentForOrder } from "@/lib/biteship/create-shipment-for-order";
import { createNotification } from "@/lib/notifications/create-notification";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";
import { getUserEmail } from "@/lib/email/get-user-email";
import { sendPaymentConfirmed } from "@/lib/email/send-payment-confirmed";
import { sendLowStockAlert } from "@/lib/email/send-low-stock-alert";
import type { Json } from "@/types/supabase";

export type ApplyPaidOrderResult = "settled" | "already_paid" | "paid_after_cancel" | "not_found";

/**
 * Marks an order as paid after the gateway confirmed settlement.
 * Shared by the Mayar webhook and the manual verify-payment route.
 *
 * Idempotent: the pending_payment -> paid transition is claimed atomically, so
 * only one caller runs the side effects (stock, emails, Biteship shipment).
 */
export async function applyPaidOrder(params: {
  orderId: string;
  paymentType: string | null;
  transactionId: string | null;
  raw: Json | null;
}): Promise<ApplyPaidOrderResult> {
  const svc = createServiceClient();

  const { data: order } = await svc
    .from("orders")
    .select("id, order_number, status, user_id, total")
    .eq("id", params.orderId)
    .maybeSingle();
  if (!order) return "not_found";

  // Record the payment first so admin sees money arrived even if the order was
  // already cancelled (expired window, customer cancel) and needs a manual refund.
  await svc
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      ...(params.transactionId ? { mayar_transaction_id: params.transactionId } : {}),
      ...(params.paymentType ? { payment_type: params.paymentType } : {}),
      raw_response: params.raw,
    })
    .eq("order_id", order.id)
    .neq("status", "paid");

  const { data: claimed } = await svc
    .from("orders")
    .update({ status: "paid" })
    .eq("id", order.id)
    .eq("status", "pending_payment")
    .select("id")
    .maybeSingle();

  if (!claimed) {
    if (order.status !== "cancelled") return "already_paid";

    await svc.from("order_status_history").insert({
      order_id: order.id,
      status: "cancelled",
      note: "Pembayaran Mayar masuk setelah pesanan dibatalkan — perlu refund manual atau pemulihan pesanan.",
      changed_by: null,
    });
    await createAdminNotification({
      title: "Pembayaran Masuk untuk Pesanan Batal",
      body: `Pesanan ${order.order_number} sudah dibatalkan tapi pembayaran Rp${order.total.toLocaleString("id-ID")} diterima Mayar. Lakukan refund manual.`,
      type: "payment_issue",
      data: { orderId: order.id, orderNumber: order.order_number, reason: "paid_after_cancel" },
    });
    return "paid_after_cancel";
  }

  const orderNumber = order.order_number;

  await svc.from("order_status_history").insert({
    order_id: order.id,
    status: "paid",
    note: `Pembayaran dikonfirmasi via Mayar${params.paymentType ? ` (${params.paymentType})` : ""}`,
    changed_by: null,
  });

  if (order.user_id) {
    await createNotification({
      userId: order.user_id,
      title: "Pembayaran Dikonfirmasi",
      body: `Pembayaran untuk pesanan ${orderNumber} berhasil dikonfirmasi. Pesanan sedang diproses.`,
      type: "payment_confirmed",
      data: { orderId: order.id, orderNumber },
    });

    const userId = order.user_id;
    // after(): tanpa ini Vercel membekukan fungsi sebelum email selesai terkirim.
    after(async () => {
      const user = await getUserEmail(userId).catch(() => null);
      if (!user) return;
      await sendPaymentConfirmed({
        to: user.email,
        name: user.name,
        orderNumber,
        orderId: order.id,
        total: order.total,
      }).catch(() => {});
    });
  }

  await createAdminNotification({
    title: "Pembayaran Diterima",
    body: `Pesanan ${orderNumber} telah dibayar. Siap untuk diproses.`,
    type: "payment_confirmed",
    data: { orderId: order.id, orderNumber },
  });

  // Deduct stock and clear reservation
  const { data: items } = await svc
    .from("order_items")
    .select("variant_id, quantity, product_name, variant_name, sku")
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
          body: `Variant ${item.variant_id} tersisa ${newStock} unit setelah pesanan ${orderNumber}.`,
          type: "low_stock",
          data: { variantId: item.variant_id, stock: newStock, orderId: order.id },
        });
        const lowStock = {
          productName: item.product_name,
          variantName: item.variant_name,
          sku: item.sku ?? null,
          stock: newStock,
          orderNumber,
        };
        after(() => sendLowStockAlert(lowStock).catch(() => {}));
      }
      await svc.from("stock_history").insert({
        variant_id: item.variant_id,
        order_id: order.id,
        quantity: -item.quantity,
        type: "sale",
        note: `Pesanan ${orderNumber} settlement`,
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
  const shipResult = await createShipmentForOrder(order.id, orderNumber);
  if (!shipResult.ok) {
    await svc.from("order_status_history").insert({
      order_id: order.id,
      status: "paid",
      note: `Biteship gagal: ${shipResult.error}. Admin dapat coba lagi atau input AWB manual di halaman pesanan.`,
      changed_by: null,
    });
  }
  return "settled";
}
