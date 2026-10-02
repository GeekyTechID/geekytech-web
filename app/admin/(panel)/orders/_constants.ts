export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const VALID_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["completed"],
};

/**
 * Status tujuan yang boleh dipilih admin. Pesanan batal yang sudah lunas
 * di-refund manual (Mayar tidak punya API refund), lalu admin menandainya
 * "refunded" — hanya kalau memang ada pembayaran `paid`.
 */
export function allowedNextStatuses(current: OrderStatus, hasPaidPayment: boolean): OrderStatus[] {
  if (current === "cancelled") return hasPaidPayment ? ["refunded"] : [];
  return VALID_TRANSITIONS[current] ?? [];
}
