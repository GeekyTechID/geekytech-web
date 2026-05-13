export const MIDTRANS_CHECKOUT_PAYMENT_OPTIONS = [
  { id: "bca_va" as const, label: "BCA Virtual Account" },
  { id: "bni_va" as const, label: "BNI Virtual Account" },
  { id: "bri_va" as const, label: "BRI Virtual Account" },
  { id: "gopay" as const, label: "GoPay" },
  { id: "indomaret" as const, label: "Indomaret" },
] as const;

export type MidtransCheckoutPaymentId = (typeof MIDTRANS_CHECKOUT_PAYMENT_OPTIONS)[number]["id"];
