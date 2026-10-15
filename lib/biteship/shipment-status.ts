import type { Database } from "@/types/supabase";
import type { BiteshipOrderHistoryItem } from "@/lib/biteship/get-order";

type ShipmentStatus = Database["public"]["Enums"]["shipment_status"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

/** 1 entri timeline di shipments.tracking_history (oldest → newest). */
export type TrackingHistoryEntry = {
  status: string; // status mentah Biteship (lowercase)
  note: string; // catatan kurir (lokasi hub, dll.)
  at: string; // ISO timestamp
  images?: string[]; // foto bukti kurir (proof of delivery)
};

/** Status Biteship → enum shipment_status (1:1 bila ada). */
export function mapShipmentStatus(biteshipStatus: string): ShipmentStatus {
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
    case "in_transit": // status Biteship antara picked → dropping_off (tidak ada di enum kita)
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

/**
 * Shipment status → order status. Pesanan baru "Dikirim" setelah paket benar-benar
 * diambil kurir — confirmed/allocated/picking_up masih tahap "Diproses" toko.
 */
export function orderStatusFromShipment(shipmentStatus: ShipmentStatus): OrderStatus | null {
  switch (shipmentStatus) {
    case "picked":
    case "dropping_off":
      return "shipped";
    case "delivered":
      return "delivered";
    default:
      return null;
  }
}

/** courier.history Biteship → tracking_history kita. */
export function trackingHistoryFromBiteship(history: BiteshipOrderHistoryItem[]): TrackingHistoryEntry[] {
  return history.map((h) => ({
    status: h.status,
    note: h.note,
    at: h.updated_at ?? new Date().toISOString(),
    ...(h.images.length > 0 ? { images: h.images } : {}),
  }));
}

/** Waktu pertama kali status tertentu muncul di riwayat. */
export function firstAt(history: TrackingHistoryEntry[], status: string): string | null {
  return history.find((h) => h.status === status)?.at ?? null;
}
