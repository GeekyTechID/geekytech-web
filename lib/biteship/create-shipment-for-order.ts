import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { createBiteshipOrder } from "@/lib/biteship/create-order";
import { ON_DEMAND_COURIERS, parseOriginCoords, resolveOnDemandCoords } from "@/lib/shipping/on-demand-coords";

export type CreateShipmentResult =
  | { ok: true; awb: string | null }
  | { ok: false; error: string };

/**
 * Creates the Biteship order for a paid order and stores it in `shipments`.
 * Used right after settlement and by the admin "retry" action when the first
 * attempt failed (e.g. inactive API key). Does nothing if a shipment exists.
 */
export async function createShipmentForOrder(orderId: string, orderNumber: string): Promise<CreateShipmentResult> {
  const svc = createServiceClient();

  const { data: existingShipment } = await svc
    .from("shipments")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existingShipment) return { ok: false, error: "Pengiriman untuk pesanan ini sudah ada." };

  const [{ data: orderFull }, { data: settingsRow }] = await Promise.all([
    svc
      .from("orders")
      .select("courier_company, courier_service, recipient_name, recipient_phone, shipping_address, shipping_postal, shipping_lat, shipping_lng")
      .eq("id", orderId)
      .single(),
    svc.from("settings").select("value").eq("key", "store_origin").maybeSingle(),
  ]);
  const storeOrigin = (settingsRow?.value ?? null) as { lat?: string; lng?: string } | null;

  if (!orderFull?.courier_company || !orderFull.courier_service) {
    return { ok: false, error: "Pesanan tidak punya data kurir." };
  }

  const { data: orderItems } = await svc
    .from("order_items")
    .select("product_name, price, quantity, weight")
    .eq("order_id", orderId);
  if (!orderItems?.length) return { ok: false, error: "Pesanan tidak punya item." };

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
    orderNote: `GeekyTech Order ${orderNumber}`,
    ...onDemandCoords,
  });

  if (!shipResult.ok) {
    const isOnDemand = ON_DEMAND_COURIERS.has(orderFull.courier_company.toLowerCase());
    const hasOriginCoords = parseOriginCoords(storeOrigin) !== null;
    const coordHint = isOnDemand && !hasOriginCoords
      ? " (Koordinat origin belum dikonfigurasi — isi Latitude & Longitude di Admin → Pengaturan → Pengiriman)"
      : "";
    return { ok: false, error: `${shipResult.error}${coordHint}` };
  }

  await svc.from("shipments").insert({
    order_id: orderId,
    courier_company: orderFull.courier_company,
    courier_name: shipResult.courierName,
    courier_service: orderFull.courier_service,
    biteship_order_id: shipResult.biteshipOrderId,
    awb: shipResult.awb,
    status: "pending",
  });
  return { ok: true, awb: shipResult.awb ?? null };
}
