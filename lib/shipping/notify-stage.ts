/**
 * Tahap pengiriman yang memicu notifikasi ke pelanggan. Beberapa status Biteship
 * masuk tahap yang sama (picking_up & picked = "pickup"), jadi notifikasi hanya
 * dikirim saat tahapnya berubah — bukan setiap webhook / sinkron manual.
 */
export type ShipmentNotifyStage = "pickup" | "in_transit" | "delivered";

export function shipmentNotifyStage(
  status: string | null | undefined,
  dropOff = false,
): ShipmentNotifyStage | null {
  switch (status) {
    case "picking_up":
      // Drop off: kurir tidak menjemput — notifikasi baru saat paket diterima kurir (picked).
      return dropOff ? null : "pickup";
    case "picked":
      return "pickup";
    case "dropping_off":
      return "in_transit";
    case "delivered":
      return "delivered";
    default:
      return null;
  }
}

/** Tahap baru yang perlu dinotifikasi, atau null kalau tahapnya sama dengan sebelumnya. */
export function shipmentStageToNotify(
  previousStatus: string | null | undefined,
  nextStatus: string | null | undefined,
  dropOff = false,
): ShipmentNotifyStage | null {
  const next = shipmentNotifyStage(nextStatus, dropOff);
  if (!next || next === shipmentNotifyStage(previousStatus, dropOff)) return null;
  return next;
}

/** Isi notifikasi pelanggan untuk tahap pengiriman. */
export function shipmentNotificationContent(
  stage: ShipmentNotifyStage,
  shipmentStatus: string,
  orderNumber: string,
): { title: string; body: string; type: "order_shipped" | "order_in_transit" | "order_delivered" } {
  switch (stage) {
    case "pickup":
      return shipmentStatus === "picking_up"
        ? {
            title: "Kurir Menjemput Paket",
            body: `Kurir sedang menuju toko untuk menjemput pesanan ${orderNumber}.`,
            type: "order_shipped",
          }
        : {
            title: "Pesanan Telah Dikirim",
            body: `Pesanan ${orderNumber} sudah diserahkan ke kurir dan segera dikirim.`,
            type: "order_shipped",
          };
    case "in_transit":
      return {
        title: "Pesanan Dalam Perjalanan",
        body: `Pesanan ${orderNumber} sedang dalam perjalanan ke alamatmu.`,
        type: "order_in_transit",
      };
    case "delivered":
      return {
        title: "Pesanan Telah Sampai",
        body: `Pesanan ${orderNumber} telah sampai di tujuan. Jangan lupa beri ulasan!`,
        type: "order_delivered",
      };
  }
}
