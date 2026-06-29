import { FROM, resend } from "@/lib/email/resend";
import { paymentInstructionsHtml } from "@/lib/email/templates/payment-instructions";

export async function sendPaymentInstructions(params: {
  to: string;
  name: string;
  orderNumber: string;
  orderId: string;
  total: number;
  paymentType: string | null;
  vaBank: string | null;
  vaNumber: string | null;
  paymentCode: string | null;
  pdfUrl: string | null;
  expiryTime: string | null;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://geeky.id";

  const { error } = await resend.emails.send(
    {
      from: FROM,
      to: params.to,
      subject: `Selesaikan Pembayaran Pesanan ${params.orderNumber}`,
      html: paymentInstructionsHtml({ ...params, appUrl }),
    },
    { idempotencyKey: `payment-instructions/${params.orderNumber}` },
  );

  if (error) {
    console.error("[email] sendPaymentInstructions failed:", error);
  }
}
