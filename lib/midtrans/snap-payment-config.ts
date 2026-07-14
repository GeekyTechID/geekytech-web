export const MIDTRANS_SANDBOX_ENABLED_PAYMENTS = [
  "gopay",
  "shopeepay",
  "qris",
  "bca_va",
  "bni_va",
  "bri_va",
  "permata_va",
  "echannel",
  "indomaret",
  "alfamart",
  "credit_card",
] as const;

type SnapPaymentConfig = {
  enabled_payments?: string[];
};

export function getSnapPaymentConfig(
  isProduction: boolean,
): SnapPaymentConfig {
  return {
    ...(isProduction
      ? {}
      : { enabled_payments: [...MIDTRANS_SANDBOX_ENABLED_PAYMENTS] }),
  };
}
