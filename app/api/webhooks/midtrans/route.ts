import { createHash } from "node:crypto";

import { createServiceClient } from "@/lib/supabase/server";
import { createBiteshipOrder } from "@/lib/biteship/create-order";
import type { Json } from "@/types/supabase";

type MidtransNotification = {
  order_id?: string;
  transaction_status?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
  va_numbers?: { bank: string; va_number: string }[];
  payment_code?: string;
  pdf_url?: string;
  expiry_time?: string;
};

function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  sig: string,
): boolean {
  const hash = createHash("sha512")
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest("hex");
  return hash === sig;
}

async function applySettlement(orderId: string, notification: MidtransNotification) {
  const svc = createServiceClient();

  const { data: order } = await svc
    .from("orders")
    .select("id, status")
    .eq("order_number", orderId)
    .maybeSingle();

  if (!order) return;

  if (order.status === "pending_payment") {
    await svc.from("orders").update({ status: "paid" }).eq("id", order.id);
    await svc.from("order_status_history").insert({
      order_id: order.id,
      status: "paid",
      note: `Pembayaran dikonfirmasi via Midtrans webhook (${notification.payment_type ?? ""})`,
      changed_by: null,
    });

    // Deduct stock and clear reservation
    const { data: items } = await svc
      .from("order_items")
      .select("variant_id, quantity")
      .eq("order_id", order.id);

    if (items) {
      for (const item of items) {
        if (!item.variant_id) continue;
        const { data: v } = await svc
          .from("product_variants")
          .select("stock, reserved")
          .eq("id", item.variant_id)
          .single();
        if (!v) continue;
        await svc
          .from("product_variants")
          .update({
            stock: Math.max(0, v.stock - item.quantity),
            reserved: Math.max(0, v.reserved - item.quantity),
          })
          .eq("id", item.variant_id);
        await svc.from("stock_history").insert({
          variant_id: item.variant_id,
          order_id: order.id,
          quantity: -item.quantity,
          type: "sale",
          note: `Pesanan ${orderId} settlement`,
          changed_by: null,
        });
      }
    }
  }

  const vaNumber = notification.va_numbers?.[0]?.va_number ?? null;
  await svc
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      midtrans_transaction_id: notification.transaction_id ?? null,
      va_number: vaNumber,
      payment_code: notification.payment_code ?? null,
      pdf_url: notification.pdf_url ?? null,
      expiry_time: notification.expiry_time ?? null,
      raw_response: notification as unknown as Json,
    })
    .eq("midtrans_order_id", orderId)
    .neq("status", "paid");

  // Create Biteship shipment after payment confirmed
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
        orderNote: `GeekyTech Order ${orderId}`,
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
      }
    }
  }
}

async function applyCancelOrExpire(orderId: string, newPaymentStatus: "cancelled" | "expired" | "failed") {
  const svc = createServiceClient();

  const { data: order } = await svc
    .from("orders")
    .select("id, status")
    .eq("order_number", orderId)
    .maybeSingle();

  if (!order || order.status !== "pending_payment") return;

  await svc.from("orders").update({ status: "cancelled" }).eq("id", order.id);

  // Release stock reservation
  const { data: items } = await svc
    .from("order_items")
    .select("variant_id, quantity")
    .eq("order_id", order.id);

  if (items) {
    for (const item of items) {
      if (!item.variant_id) continue;
      const { data: v } = await svc
        .from("product_variants")
        .select("reserved")
        .eq("id", item.variant_id)
        .single();
      if (!v) continue;
      await svc
        .from("product_variants")
        .update({ reserved: Math.max(0, v.reserved - item.quantity) })
        .eq("id", item.variant_id);
    }
  }

  await svc
    .from("payments")
    .update({ status: newPaymentStatus })
    .eq("midtrans_order_id", orderId)
    .eq("status", "pending");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as MidtransNotification;

    const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
    if (!serverKey) return Response.json({ ok: false }, { status: 500 });

    if (!body.order_id || !body.status_code || !body.gross_amount || !body.signature_key) {
      return Response.json({ ok: false }, { status: 400 });
    }

    if (!verifySignature(body.order_id, body.status_code, body.gross_amount, serverKey, body.signature_key)) {
      return Response.json({ ok: false }, { status: 401 });
    }

    const txStatus = body.transaction_status;
    const fraudStatus = body.fraud_status;

    if (
      (txStatus === "settlement" || txStatus === "capture") &&
      fraudStatus !== "deny"
    ) {
      await applySettlement(body.order_id, body);
    } else if (txStatus === "expire") {
      await applyCancelOrExpire(body.order_id, "expired");
    } else if (txStatus === "cancel") {
      await applyCancelOrExpire(body.order_id, "cancelled");
    } else if (txStatus === "deny" || fraudStatus === "deny") {
      await applyCancelOrExpire(body.order_id, "failed");
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
