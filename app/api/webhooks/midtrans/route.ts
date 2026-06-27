import { createHash } from "node:crypto";

import { createServiceClient } from "@/lib/supabase/server";
import { createBiteshipOrder } from "@/lib/biteship/create-order";
import { ON_DEMAND_COURIERS, parseOriginCoords, resolveOnDemandCoords } from "@/lib/shipping/on-demand-coords";
import { createNotification } from "@/lib/notifications/create-notification";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";
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

function resolvePaymentType(notification: MidtransNotification): string | null {
  if (!notification.payment_type) return null;
  if (notification.payment_type === "bank_transfer" && notification.va_numbers?.[0]?.bank) {
    return `${notification.va_numbers[0].bank}_va`;
  }
  return notification.payment_type;
}

async function applySettlement(orderId: string, notification: MidtransNotification) {
  const svc = createServiceClient();

  const [{ data: order }, { data: settingsRow }] = await Promise.all([
    svc.from("orders").select("id, status, user_id").eq("order_number", orderId).maybeSingle(),
    svc.from("settings").select("value").eq("key", "store_origin").maybeSingle(),
  ]);
  const storeOrigin = (settingsRow?.value ?? null) as { lat?: string; lng?: string } | null;

  if (!order) return;

  if (order.status === "pending_payment") {
    await svc.from("orders").update({ status: "paid" }).eq("id", order.id);
    await svc.from("order_status_history").insert({
      order_id: order.id,
      status: "paid",
      note: `Pembayaran dikonfirmasi via Midtrans webhook (${notification.payment_type ?? ""})`,
      changed_by: null,
    });

    if (order.user_id) {
      await createNotification({
        userId: order.user_id,
        title: "Pembayaran Dikonfirmasi",
        body: `Pembayaran untuk pesanan ${orderId} berhasil dikonfirmasi. Pesanan sedang diproses.`,
        type: "payment_confirmed",
        data: { orderId: order.id, orderNumber: orderId },
      });
    }

    await createAdminNotification({
      title: "Pembayaran Diterima",
      body: `Pesanan ${orderId} telah dibayar. Siap untuk diproses.`,
      type: "payment_confirmed",
      data: { orderId: order.id, orderNumber: orderId },
    });

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
            body: `Variant ${item.variant_id} tersisa ${newStock} unit setelah pesanan ${orderId}.`,
            type: "low_stock",
            data: { variantId: item.variant_id, stock: newStock, orderId: order.id },
          });
        }
        await svc.from("stock_history").insert({
          variant_id: item.variant_id,
          order_id: order.id,
          quantity: -item.quantity,
          type: "sale",
          note: `Pesanan ${orderId} settlement`,
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
        .select("courier_company, courier_service, recipient_name, recipient_phone, shipping_address, shipping_postal, shipping_lat, shipping_lng")
        .eq("id", order.id)
        .single();

      if (orderFull?.courier_company && orderFull.courier_service) {
        const { data: orderItems } = await svc
          .from("order_items")
          .select("product_name, price, quantity, weight")
          .eq("order_id", order.id);

        if (orderItems?.length) {
          const postalNum = parseInt(orderFull.shipping_postal.replace(/\D/g, ""), 10);
          const onDemandCoords = await resolveOnDemandCoords(orderFull.courier_company, postalNum, storeOrigin, {
            lat: orderFull.shipping_lat,
            lng: orderFull.shipping_lng,
          });
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
            ...onDemandCoords,
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
            const isOnDemand = ON_DEMAND_COURIERS.has(orderFull.courier_company.toLowerCase());
            const hasOriginCoords = parseOriginCoords(storeOrigin) !== null;
            const coordHint = isOnDemand && !hasOriginCoords
              ? " (Koordinat origin belum dikonfigurasi — isi Latitude & Longitude di Admin → Pengaturan → Pengiriman)"
              : "";
            await svc.from("order_status_history").insert({
              order_id: order.id,
              status: "paid",
              note: `Biteship gagal: ${shipResult.error}${coordHint}. Admin dapat input AWB manual di halaman pesanan.`,
              changed_by: null,
            });
          }
        }
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
      ...(resolvePaymentType(notification) ? { payment_type: resolvePaymentType(notification) } : {}),
      va_number: vaNumber,
      payment_code: notification.payment_code ?? null,
      pdf_url: notification.pdf_url ?? null,
      expiry_time: midtransExpiryToISO(notification.expiry_time),
      raw_response: notification as unknown as Json,
    })
    .eq("midtrans_order_id", orderId)
    .neq("status", "paid");
}

// Midtrans expiry_time is "YYYY-MM-DD HH:MM:SS" in WIB (UTC+7).
// Append "+07:00" so PostgreSQL timestamptz stores the correct UTC value.
function midtransExpiryToISO(t: string | undefined | null): string | null {
  if (!t) return null;
  return t.replace(" ", "T") + "+07:00";
}

async function applyPending(orderId: string, notification: MidtransNotification) {
  const svc = createServiceClient();
  const vaNumber = notification.va_numbers?.[0]?.va_number ?? null;
  const resolvedType = resolvePaymentType(notification);
  await svc
    .from("payments")
    .update({
      midtrans_transaction_id: notification.transaction_id ?? null,
      ...(resolvedType ? { payment_type: resolvedType } : {}),
      va_number: vaNumber,
      payment_code: notification.payment_code ?? null,
      expiry_time: midtransExpiryToISO(notification.expiry_time),
      raw_response: notification as unknown as Json,
    })
    .eq("midtrans_order_id", orderId)
    .eq("status", "pending");
}

async function applyCancelOrExpire(orderId: string, newPaymentStatus: "cancelled" | "expired" | "failed") {
  const svc = createServiceClient();

  const { data: order } = await svc
    .from("orders")
    .select("id, status, user_id")
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

  if (order.user_id) {
    const notifMap: Record<typeof newPaymentStatus, { title: string; body: string }> = {
      expired: {
        title: "Pembayaran Kedaluwarsa",
        body: `Pesanan ${orderId} dibatalkan karena melewati batas waktu pembayaran.`,
      },
      cancelled: {
        title: "Pembayaran Dibatalkan",
        body: `Pesanan ${orderId} dibatalkan. Hubungi kami jika ada pertanyaan.`,
      },
      failed: {
        title: "Pembayaran Ditolak",
        body: `Pembayaran untuk pesanan ${orderId} ditolak oleh sistem. Silakan coba lagi.`,
      },
    };
    const notif = notifMap[newPaymentStatus];
    await createNotification({
      userId: order.user_id,
      title: notif.title,
      body: notif.body,
      type: `payment_${newPaymentStatus}`,
      data: { orderId: order.id, orderNumber: orderId },
    });
  }

  await createAdminNotification({
    title: "Pembayaran Gagal/Kedaluwarsa",
    body: `Pesanan ${orderId} dibatalkan (${newPaymentStatus}).`,
    type: "payment_issue",
    data: { orderId: order.id, orderNumber: orderId, reason: newPaymentStatus },
  });
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
    } else if (txStatus === "pending") {
      await applyPending(body.order_id, body);
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
