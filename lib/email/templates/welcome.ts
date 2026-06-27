export function welcomeEmailHtml({
  name,
  appUrl,
}: {
  name: string;
  appUrl: string;
}): string {
  const firstName = name.split(" ")[0] ?? name;
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Selamat Datang di GeekyTech</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#1d1d1f;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">GeekyTech</p>
              <p style="margin:6px 0 0;font-size:13px;color:#a1a1a6;">Gear up. Level up.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:24px;font-weight:600;color:#1d1d1f;">Halo, ${firstName}! 👋</p>
              <p style="margin:0 0 24px;font-size:16px;color:#3d3d3d;line-height:1.6;">
                Selamat datang di <strong>GeekyTech</strong>. Akun kamu sudah aktif dan siap digunakan.
                Temukan ribuan produk tech &amp; gadget original bergaransi resmi di toko kami.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
                <tr>
                  <td style="background:#EA5329;border-radius:10px;">
                    <a href="${appUrl}/products"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Mulai Belanja
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#1d1d1f;">Apa yang bisa kamu lakukan?</p>
              <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;color:#3d3d3d;line-height:1.8;">
                <li>Cek ratusan produk tech original</li>
                <li>Lacak pesanan secara real-time</li>
                <li>Simpan produk favorit ke wishlist</li>
                <li>Kelola alamat pengiriman</li>
              </ul>

              <p style="margin:0;font-size:14px;color:#6e6e73;line-height:1.6;">
                Ada pertanyaan? Hubungi kami di
                <a href="${appUrl}/contact" style="color:#EA5329;text-decoration:none;">halaman kontak</a>
                atau WhatsApp CS kami.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f5f7;padding:24px 40px;text-align:center;border-top:1px solid #e0e0e0;">
              <p style="margin:0;font-size:12px;color:#6e6e73;">
                &copy; 2025 GeekyTech &mdash; Toko Tech &amp; Gadget
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#6e6e73;">
                <a href="${appUrl}" style="color:#6e6e73;text-decoration:none;">geeky.id</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
