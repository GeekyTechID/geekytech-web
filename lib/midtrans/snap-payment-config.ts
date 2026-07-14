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
  shopeepay?: {
    callback_url: string;
  };
};

export function getSnapPaymentConfig(
  isProduction: boolean,
  orderUrl: string | null,
): SnapPaymentConfig {
  return {
    ...(isProduction
      ? {}
      : { enabled_payments: [...MIDTRANS_SANDBOX_ENABLED_PAYMENTS] }),
    ...(orderUrl
      ? {
          shopeepay: {
            callback_url: orderUrl,
          },
        }
      : {}),
  };
}
