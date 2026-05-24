import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type ShipmentStatus = Database["public"]["Enums"]["shipment_status"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

type BiteshipWebhookBody = {
  event?: string;
  order_id?: string;
  courier?: {
    waybill_id?: string;
    company?: string;
    name?: string;
    type?: string;
    tracking_id?: string;
  };
  status?: string;
  destination?: {
    name?: string;
  };
  origin?: {
    name?: string;
  };
};

// Map Biteship statuses to our shipment_status enum
function mapShipmentStatus(biteshipStatus: string): ShipmentStatus {
  switch (biteshipStatus.toLowerCase()) {
    case "confirmed":
    case "allocated":
      return "confirmed";
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
      return "cancelled";
    case "return":
    case "returned":
      return "returned";
    default:
      return "pending";
  }
}

// Map shipment status to order status
function orderStatusFromShipment(shipmentStatus: ShipmentStatus): OrderStatus | null {
  switch (shipmentStatus) {
    case "picking_up":
    case "picked":
    case "confirmed":
    case "allocated":
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
    const body = (await req.json()) as BiteshipWebhookBody;

    // Biteship identifies the order by order_id (which is our biteship_order_id)
    const biteshipOrderId = body.order_id;
    if (!biteshipOrderId) {
      // Installation ping dari Biteship — body kosong, wajib return 200 ok
      return Response.json({ ok: true });
    }

    const svc = createServiceClient();

    const { data: shipment } = await svc
      .from("shipments")
      .select("id, order_id, status")
      .eq("biteship_order_id", biteshipOrderId)
      .maybeSingle();

    if (!shipment) {
      return Response.json({ ok: true }); // unknown order, silently accept
    }

    const newShipStatus = mapShipmentStatus(body.status ?? "");
    const awb = body.courier?.waybill_id ?? null;
    const courierName = body.courier?.name ?? null;

    const updatePayload: Database["public"]["Tables"]["shipments"]["Update"] = {
      status: newShipStatus,
      updated_at: new Date().toISOString(),
    };
    if (awb) updatePayload.awb = awb;
    if (courierName) updatePayload.courier_name = courierName;
    if (newShipStatus === "delivered") {
      updatePayload.delivered_at = new Date().toISOString();
    }

    await svc.from("shipments").update(updatePayload).eq("id", shipment.id);

    // Debug: simpan raw payload agar mudah dicek — hapus setelah masalah teridentifikasi
    await svc.from("order_status_history").insert({
      order_id: shipment.order_id,
      status: "processing" as const,
      note: `[DEBUG] raw payload: ${JSON.stringify(body)}`,
      changed_by: null,
    });

    // Sync order status
    const newOrderStatus = orderStatusFromShipment(newShipStatus);
    if (newOrderStatus) {
      const { data: order } = await svc
        .from("orders")
        .select("id, status")
        .eq("id", shipment.order_id)
        .maybeSingle();

      if (order && order.status !== newOrderStatus && order.status !== "completed" && order.status !== "cancelled") {
        await svc.from("orders").update({ status: newOrderStatus }).eq("id", order.id);
        await svc.from("order_status_history").insert({
          order_id: order.id,
          status: newOrderStatus,
          note: `Status diperbarui otomatis dari Biteship: ${body.status ?? ""}`,
          changed_by: null,
        });
      }
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
