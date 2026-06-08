import { createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";
import type { Database, Json } from "@/types/supabase";

type ShipmentStatus = Database["public"]["Enums"]["shipment_status"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

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

/** 1 entri timeline yang disimpan ke shipments.tracking_history (oldest → newest). */
type TrackingHistoryEntry = {
  status: string; // status mentah Biteship (lowercase) — granular utk tampilan
  note: string; // detail kurir/driver bila ada
  at: string; // ISO timestamp
};

// Map status Biteship → enum shipment_status kita (1:1 bila ada).
function mapShipmentStatus(biteshipStatus: string): ShipmentStatus {
  switch (biteshipStatus.toLowerCase()) {
    case "confirmed":
      return "confirmed";
    case "allocated":
      return "allocated";
    case "picking_up":
      return "picking_up";
    case "picked":
      return "picked";
    case "dropping_off":
      return "dropping_off";
    case "delivered":
      return "delivered";
    case "rejected":
      return "rejected";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "return":
    case "returned":
      return "returned";
    default:
      return "pending";
  }
}

// Map shipment status → order status.
function orderStatusFromShipment(shipmentStatus: ShipmentStatus): OrderStatus | null {
  switch (shipmentStatus) {
    case "confirmed":
    case "allocated":
    case "picking_up":
    case "picked":
    case "dropping_off":
      return "shipped";
    case "delivered":
      return "delivered";
    default:
      return null;
  }
}

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
    const secret = process.env.BITESHIP_WEBHOOK_SECRET?.trim();
    if (secret) {
      const token = new URL(req.url).searchParams.get("token");
      if (token !== secret) {
        return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const svc = createServiceClient();

    const { data: shipment } = await svc
      .from("shipments")
      .select("id, order_id, status, tracking_history")
      .eq("biteship_order_id", biteshipOrderId)
      .maybeSingle();

    if (!shipment) {
      return Response.json({ ok: true }); // unknown order, silently accept
    }

    const newShipStatus = mapShipmentStatus(rawStatus);
    const awb = body.courier_waybill_id ?? body.courier?.waybill_id ?? null;
    const courierName = body.courier_driver_name ?? body.courier?.name ?? null;
    const at = body.updated_at ?? new Date().toISOString();

    // ── Append ke tracking_history (dedup entri identik terakhir) ──
    const history: TrackingHistoryEntry[] = Array.isArray(shipment.tracking_history)
      ? (shipment.tracking_history as unknown as TrackingHistoryEntry[])
      : [];
    const note = [body.courier_driver_name, body.courier_driver_phone].filter(Boolean).join(" · ");
    const entry: TrackingHistoryEntry = { status: rawStatus, note, at };
    const last = history.at(-1);
    const newHistory =
      last && last.status === entry.status && last.at === entry.at
        ? history
        : [...history, entry];

    const updatePayload: Database["public"]["Tables"]["shipments"]["Update"] = {
      tracking_history: newHistory as unknown as Json,
      updated_at: new Date().toISOString(),
    };
    // Hanya ubah status kalau dikenali (jangan downgrade ke pending utk status tak dikenal).
    if (newShipStatus !== "pending") updatePayload.status = newShipStatus;
    if (awb) updatePayload.awb = awb;
    if (courierName) updatePayload.courier_name = courierName;
    if (newShipStatus === "picked") updatePayload.picked_up_at = at;
    if (newShipStatus === "delivered") updatePayload.delivered_at = at;

    await svc.from("shipments").update(updatePayload).eq("id", shipment.id);

    const { data: orderRow } = await svc
      .from("orders")
      .select("id, user_id, order_number, status")
      .eq("id", shipment.order_id)
      .maybeSingle();

    // ── Sync order status + riwayat ──
    const newOrderStatus = orderStatusFromShipment(newShipStatus);
    if (
      orderRow &&
      newOrderStatus &&
      orderRow.status !== newOrderStatus &&
      orderRow.status !== "completed" &&
      orderRow.status !== "cancelled"
    ) {
      await svc.from("orders").update({ status: newOrderStatus }).eq("id", orderRow.id);
      await svc.from("order_status_history").insert({
        order_id: orderRow.id,
        status: newOrderStatus,
        note: `Status diperbarui otomatis dari Biteship: ${rawStatus}`,
        changed_by: null,
      });
    }

    // ── Notifikasi user ──
    if (orderRow?.user_id && orderRow.order_number) {
      if (newShipStatus === "picking_up" || newShipStatus === "picked") {
        await createNotification({
          userId: orderRow.user_id,
          title: "Pesanan Sedang Dikemas",
          body: `Pesanan ${orderRow.order_number} sedang dikemas dan siap dikirim.`,
          type: "order_shipped",
          data: { orderId: shipment.order_id, awb: awb ?? undefined },
        });
      } else if (newShipStatus === "dropping_off") {
        await createNotification({
          userId: orderRow.user_id,
          title: "Pesanan Dalam Perjalanan",
          body: `Pesanan ${orderRow.order_number} sedang dalam perjalanan ke alamatmu.`,
          type: "order_in_transit",
          data: { orderId: shipment.order_id, awb: awb ?? undefined },
        });
      } else if (newShipStatus === "delivered") {
        await createNotification({
          userId: orderRow.user_id,
          title: "Pesanan Telah Sampai",
          body: `Pesanan ${orderRow.order_number} telah sampai di tujuan. Jangan lupa beri ulasan!`,
          type: "order_delivered",
          data: { orderId: shipment.order_id },
        });
      }
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
