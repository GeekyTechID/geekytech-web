export function refundDurationText(paymentType: string | null | undefined): string {
  switch (paymentType) {
    case "gopay":
    case "shopeepay":
      return "1–7 hari kerja (dikembalikan ke dompet digital)";
    case "qris":
      return "1–14 hari kerja (tergantung penerbit QRIS)";
    case "credit_card":
      return "7–14 hari kerja (dikembalikan ke kartu kredit)";
    case "bank_transfer":
    default:
      return "3–14 hari kerja (dikembalikan ke rekening asal)";
  }
}
