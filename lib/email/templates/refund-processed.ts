import { emailShell, ctaButton } from "./base";

export function refundProcessedHtml(params: {
  name: string;
  orderNumber: string;
  appUrl: string;
}): string {
  const firstName = params.name.split(" ")[0] ?? params.name;

  const body = `
    <p style="margin:0 0 4px;font-size:22px;font-weight:600;color:#1d1d1f;letter-spacing:-0.3px;">Refund Dikonfirmasi</p>
    <p style="margin:0 0 24px;font-size:15px;color:#3d3d3d;line-height:1.6;">
      Halo, ${firstName}! Refund untuk pesananmu sudah dikonfirmasi oleh Midtrans.
    </p>

    <div style="background:#f5f5f7;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 2px;font-size:11px;font-weight:500;color:#6e6e73;letter-spacing:0.5px;text-transform:uppercase;">Nomor Pesanan</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#1d1d1f;">${params.orderNumber}</p>
    </div>

    <div style="background:#f0f7ff;border-radius:10px;padding:16px 20px;margin:0 0 24px;border-left:3px solid #0071e3;">
      <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1d1d1f;">Estimasi Dana Masuk</p>
      <p style="margin:0;font-size:13px;color:#3d3d3d;line-height:1.6;">
        Dana akan masuk ke rekening atau dompet digitalmu dalam <strong>1&ndash;14 hari kerja</strong> tergantung pada metode pembayaran dan kebijakan bank.
      </p>
    </div>

    <p style="margin:0 0 24px;font-size:14px;color:#3d3d3d;line-height:1.6;">
      Jika dana belum masuk setelah 14 hari kerja, silakan hubungi CS kami dengan menyertakan nomor pesanan di atas.
    </p>

    ${ctaButton(`${params.appUrl}/about#kontak`, "Hubungi CS")}

    <p style="margin:8px 0 0;font-size:13px;color:#6e6e73;line-height:1.6;">
      Terima kasih atas kesabaranmu. Maaf atas ketidaknyamanan yang dialami.
    </p>`;

  return emailShell({
    title: `Refund ${params.orderNumber} Dikonfirmasi — GeekyTech`,
    preheader: `Refund untuk pesanan ${params.orderNumber} sudah diproses. Dana akan masuk 1-14 hari kerja.`,
    body,
    appUrl: params.appUrl,
  });
}
