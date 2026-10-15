import { after } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { getUserEmail } from "@/lib/email/get-user-email";
import { sendOrderShipped } from "@/lib/email/send-order-shipped";
import { sendOrderDelivered } from "@/lib/email/send-order-delivered";
import { shipmentNotificationContent, shipmentStageToNotify } from "@/lib/shipping/notify-stage";
import { getBiteshipOrder } from "@/lib/biteship/get-order";
import {
  firstAt,
  mapShipmentStatus,
  orderStatusFromShipment,
  trackingHistoryFromBiteship,
  type TrackingHistoryEntry,
} from "@/lib/biteship/shipment-status";
import type { Database, Json } from "@/types/supabase";
import { secretMatches } from "@/lib/security/safe-compare";

/**
 * Biteship webhook payload — FLAT shape (verified dari event live):
 *   { event, order_id, status, courier_waybill_id, courier_company, courier_type,
 *     courier_tracking_id, courier_link, courier_driver_name, courier_driver_phone,
 *     courier_driver_plate_number, updated_at, ... }
 * Varian nested lama (courier.*) didukung sebagai fallback.
 */
type BiteshipWebhookBody = {
  event?: string;
  order_id?: string;
  status?: string;
  updated_at?: string;
  courier_waybill_id?: string;
  courier_company?: string;
  courier_tracking_id?: string;
  courier_link?: string;
  courier_driver_name?: string;
  courier_driver_phone?: string;
  courier?: {
    waybill_id?: string;
    name?: string;
    tracking_id?: string;
    link?: string;
  };
};

export async function POST(req: Request) {
  try {
    // ── Parse body dulu — installation ping Biteship harus 200 sebelum validasi apapun ──
    let body: BiteshipWebhookBody;
    try {
      body = (await req.json()) as BiteshipWebhookBody;
    } catch {
      return Response.json({ ok: true });
    }

    // Installation ping: body kosong atau tidak ada order_id/status
    const biteshipOrderId = body.order_id;
    const rawStatus = (body.status ?? "").toLowerCase();
    if (!biteshipOrderId || !rawStatus) {
      return Response.json({ ok: true });
    }

    // ── Verifikasi secret (hanya untuk payload aktual, bukan ping) ──
    // Fail-closed: tanpa BITESHIP_WEBHOOK_SECRET semua payload ditolak.
    const token = new URL(req.url).searchParams.get("token");
    if (!secretMatches(token, process.env.BITESHIP_WEBHOOK_SECRET)) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const svc = createServiceClient();

    const newShipStatus = mapShipmentStatus(rawStatus);
    const awb = body.courier_waybill_id ?? body.courier?.waybill_id ?? null;
    const courierName = body.courier_driver_name ?? body.courier?.name ?? null;
    const at = body.updated_at ?? new Date().toISOString();

    const { data: shipment } = await svc
      .from("shipments")
      .select("id, order_id, status, tracking_history, picked_up_at, delivered_at")
      .eq("biteship_order_id", biteshipOrderId)
      .maybeSingle();

    if (!shipment) {
      // Not a regular order shipment — this Biteship order may be a return/replacement
      // shipment instead (tracked in return_shipments, a separate table).
      const { data: returnShipment } = await svc
        .from("return_shipments")
        .select("id, return_id")
        .eq("biteship_order_id", biteshipOrderId)
        .maybeSingle();

      if (!returnShipment) {
        return Response.json({ ok: true }); // unknown order, silently accept
      }

      const returnShipmentUpdate: Database["public"]["Tables"]["return_shipments"]["Update"] = {
        status: newShipStatus,
      };
      if (awb) returnShipmentUpdate.awb_number = awb;
      await svc.from("return_shipments").update(returnShipmentUpdate).eq("id", returnShipment.id);

      if (newShipStatus === "delivered") {
        const { data: returnRow } = await svc
          .from("returns")
          .select("id, user_id, order_id")
          .eq("id", returnShipment.return_id)
          .maybeSingle();

        if (returnRow) {
          await svc
            .from("returns")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("id", returnRow.id);

          await createNotification({
            userId: returnRow.user_id,
            title: "Retur Selesai",
            body: "Produk pengganti telah sampai di tujuan. Terima kasih atas kesabarannya!",
            type: "return_completed",
            data: { returnId: returnRow.id, orderId: returnRow.order_id },
          });
        }
      }

      return Response.json({ ok: true });
    }

    // ── Riwayat: ambil courier.history lengkap dari Biteship (catatan hub + foto bukti).
    // Payload webhook tidak membawa catatan, dan webhook bisa terlewat / datang tidak urut.
    // Fallback: append entri dari payload bila API gagal.
    const detail = await getBiteshipOrder(biteshipOrderId);
    const apiHistory = detail.ok ? trackingHistoryFromBiteship(detail.order.history) : [];
    // Status terkini dari API lebih andal daripada payload (webhook lama bisa datang belakangan).
    const apiStatus = detail.ok ? mapShipmentStatus(detail.order.status) : "pending";
    const shipStatus = apiStatus !== "pending" ? apiStatus : newShipStatus;

    let newHistory: TrackingHistoryEntry[];
    if (apiHistory.length > 0) {
      newHistory = apiHistory;
    } else {
      const history: TrackingHistoryEntry[] = Array.isArray(shipment.tracking_history)
        ? (shipment.tracking_history as unknown as TrackingHistoryEntry[])
        : [];
      const note = [body.courier_driver_name, body.courier_driver_phone].filter(Boolean).join(" · ");
      const entry: TrackingHistoryEntry = { status: rawStatus, note, at };
      const last = history.at(-1);
      newHistory =
        last && last.status === entry.status && last.at === entry.at ? history : [...history, entry];
    }

    const updatePayload: Database["public"]["Tables"]["shipments"]["Update"] = {
      tracking_history: newHistory as unknown as Json,
      updated_at: new Date().toISOString(),
    };
    // Hanya ubah status kalau dikenali (jangan downgrade ke pending utk status tak dikenal).
    if (shipStatus !== "pending") updatePayload.status = shipStatus;
    if (awb) updatePayload.awb = awb;
    if (courierName) updatePayload.courier_name = courierName;
    // Waktu pertama status muncul — picked bisa berulang (pickup + serah ke hub).
    const pickedAt = firstAt(newHistory, "picked");
    const deliveredAt = firstAt(newHistory, "delivered");
    if (!shipment.picked_up_at && (pickedAt || shipStatus === "picked")) {
      updatePayload.picked_up_at = pickedAt ?? at;
    }
    if (!shipment.delivered_at && (deliveredAt || shipStatus === "delivered")) {
      updatePayload.delivered_at = deliveredAt ?? at;
    }

    await svc.from("shipments").update(updatePayload).eq("id", shipment.id);

    const { data: orderRow } = await svc
      .from("orders")
      .select("id, user_id, order_number, status")
      .eq("id", shipment.order_id)
      .maybeSingle();

    // ── Sync order status + riwayat ──
    const newOrderStatus = orderStatusFromShipment(shipStatus);
    if (
      orderRow &&
      newOrderStatus &&
      orderRow.status !== newOrderStatus &&
      orderRow.status !== "completed" &&
      orderRow.status !== "cancelled"
    ) {
      await svc.from("orders").update({
        status: newOrderStatus,
        // Waktu kurir (bukan waktu webhook) — batas komplain 3 hari dihitung dari sini.
        ...(newOrderStatus === "delivered" ? { delivered_at: deliveredAt ?? at } : {}),
      }).eq("id", orderRow.id);
      await svc.from("order_status_history").insert({
        order_id: orderRow.id,
        status: newOrderStatus,
        note: `Status diperbarui otomatis dari Biteship: ${shipStatus}`,
        changed_by: null,
      });
    }

    // ── Notifikasi user ──
    const notifyStage = shipmentStageToNotify(shipment.status, shipStatus);
    if (orderRow?.user_id && orderRow.order_number) {
      const userId = orderRow.user_id;
      if (notifyStage) {
        const content = shipmentNotificationContent(notifyStage, shipStatus, orderRow.order_number);
        await createNotification({
          userId,
          ...content,
          data: {
            orderId: shipment.order_id,
            ...(notifyStage !== "delivered" && awb ? { awb } : {}),
          },
        });
      }

      // Email: kirim saat picking_up/picked/dropping_off (idempotency key cegah duplikat)
      if (shipStatus === "picking_up" || shipStatus === "picked" || shipStatus === "dropping_off") {
        // after(): tanpa ini Vercel membekukan fungsi sebelum email selesai terkirim.
        after(async () => {
          const user = await getUserEmail(userId).catch(() => null);
          if (!user) return;
          await sendOrderShipped({
            to: user.email,
            name: user.name,
            orderNumber: orderRow.order_number!,
            orderId: orderRow.id,
            awb: awb ?? undefined,
            courierCompany: body.courier_company ?? undefined,
            trackingUrl: body.courier_link ?? undefined,
          }).catch(() => {});
        });
      }

      if (shipStatus === "delivered") {
        after(async () => {
          const user = await getUserEmail(userId).catch(() => null);
          if (!user) return;
          await sendOrderDelivered({
            to: user.email,
            name: user.name,
            orderNumber: orderRow.order_number!,
            orderId: orderRow.id,
          }).catch(() => {});
        });
      }
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
