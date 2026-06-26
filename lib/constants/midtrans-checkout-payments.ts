export const MIDTRANS_CHECKOUT_PAYMENT_OPTIONS = [
  { id: "gopay" as const, label: "GoPay" },
  { id: "shopeepay" as const, label: "ShopeePay" },
  { id: "qris" as const, label: "QRIS" },
  { id: "bca_va" as const, label: "BCA Virtual Account" },
  { id: "bni_va" as const, label: "BNI Virtual Account" },
  { id: "bri_va" as const, label: "BRI Virtual Account" },
  { id: "permata_va" as const, label: "Permata Virtual Account" },
  { id: "echannel" as const, label: "Mandiri Bill Payment" },
  { id: "indomaret" as const, label: "Indomaret" },
  { id: "alfamart" as const, label: "Alfamart" },
  { id: "credit_card" as const, label: "Kartu Kredit" },
] as const;

export type MidtransCheckoutPaymentId = (typeof MIDTRANS_CHECKOUT_PAYMENT_OPTIONS)[number]["id"];
