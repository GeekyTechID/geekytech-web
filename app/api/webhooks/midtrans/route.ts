import { createHash } from "node:crypto";

import { createServiceClient } from "@/lib/supabase/server";
import { createBiteshipOrder } from "@/lib/biteship/create-order";
import { fetchCoordinatesFromPostal } from "@/lib/biteship/fetch-area-coordinates";

const ON_DEMAND_COURIERS = new Set(["gojek", "grab", "gosend", "borzo", "lalamove", "deliveree", "rara"]);

function parseOriginCoords(): { lat: number; lng: number } | null {
  const combined = process.env.GOJEK_GOSEND_LAT_LANG?.trim();
  if (combined) {
    const [lat, lng] = combined.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const lat = Number(process.env.GOJEK_GOSEND_LAT?.trim());
  const lng = Number(process.env.GOJEK_GOSEND_LANG?.trim() ?? process.env.GOJEK_GOSEN_LANG?.trim());
  if (Number.isFinite(lat) && lat !== 0 && Number.isFinite(lng) && lng !== 0) return { lat, lng };
  return null;
}

async function resolveOnDemandCoords(courierCompany: string, destPostal: number) {
  if (!ON_DEMAND_COURIERS.has(courierCompany.toLowerCase())) return {};
  const originCoords = parseOriginCoords();
  if (!originCoords) return {};
  const destCoords = await fetchCoordinatesFromPostal(String(destPostal));
  return {
    originLat: originCoords.lat,
    originLng: originCoords.lng,
    destLat: destCoords?.lat,
    destLng: destCoords?.lng,
  };
}
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

async function applySettlement(orderId: string, notification: MidtransNotification) {
  const svc = createServiceClient();

  const { data: order } = await svc
    .from("orders")
    .select("id, status, user_id")
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
          const onDemandCoords = await resolveOnDemandCoords(orderFull.courier_company, postalNum);
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
            // Log failure so admin can retry manually
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
