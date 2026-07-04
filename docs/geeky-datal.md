# Data Identitas Bisnis GeekyTech

> Referensi satu tempat untuk semua data kontak/identitas bisnis yang dipakai di project ini — email, WhatsApp, alamat, domain, dan badan hukum. Dikumpulkan 2026-07-03 dari kode (`app/`, `lib/`, `components/`) dan tabel `settings` di Supabase production (`xvgcmqpnrloqbneacdpx`).
>
> Update file ini setiap kali salah satu nilai di bawah berubah, supaya tetap jadi sumber kebenaran tunggal.

## Domain

| Domain | Status | Keterangan |
|---|---|---|
| `geeky.id` | **Live / production** | Storefront asli yang berfungsi. Didaftarkan ke Midtrans, dipakai sebagai `NEXT_PUBLIC_APP_URL` di Vercel Production (dikonfirmasi 2026-07-04), dan jadi fallback di semua kode. |
| `geekytech.com` | Parkir / tidak dipakai | Hanya redirect ke `/lander`, bukan toko. Jangan gunakan di fallback URL atau email manapun. |
| `geekytech.id` | Legacy, jarang muncul | Masih disebut di `components/dashboard/invoice-print-view.tsx:102,215` sebagai teks brand di invoice. Bukan domain yang benar-benar di-resolve, sebaiknya diseragamkan ke `geeky.id` di sesi berikutnya. |

## Email

| Alamat | Dipakai untuk | Sumber |
|---|---|---|
| `support@geeky.id` | Email kontak publik (halaman Contact, FAQ, Terms, Privasi, Pengembalian) | Literal string di kode — sudah diseragamkan dari `support@geekytech.com` (item #8, 2026-07-04) |
| `noreply@geeky.id` | Fallback pengirim email transaksional (Resend) | `lib/email/resend.ts` (`FROM_EMAIL` fallback) |
| `admin@geeky.id` | Fallback email notifikasi admin (Resend) | `lib/email/resend.ts` (`ADMIN_EMAIL` fallback) |

Catatan: `RESEND_FROM_EMAIL` dan `RESEND_ADMIN_EMAIL` sebenarnya dikontrol lewat environment variable di Vercel — nilai literal di atas cuma fallback kalau env var tidak di-set. Nilai aktual di production perlu dicek langsung di Vercel dashboard kalau perlu kepastian 100%.

## WhatsApp / Telepon

| Nomor | Dipakai untuk | Sumber |
|---|---|---|
| `6281992283947` | Nomor WhatsApp CS publik (`/contact`, footer, halaman legal, FAQ) **dan** nomor telepon pengirim label pengiriman (Biteship) — satu nomor yang sama, dikonfirmasi user | `settings.whatsapp_cs` dan `settings.store_origin.phone` (tabel `settings`, diedit lewat Admin → Settings) |

Sudah diupdate dari placeholder seed `6281234567890` ke nomor asli di atas pada 2026-07-04.

## Alamat (Store Origin)

Sumber: `settings.store_origin`, diedit lewat Admin → Settings → Shipping. **Sudah diisi data asli** (bukan placeholder):

```
Nama pengirim : GeekyTech
Alamat        : Unit GSA-037, Bellezza Shopping Arcade, Jl. Arteri Permata Hijau No.34 Lt. G, RT. 4/RW. 2
Kelurahan     : Grogol Utara
Kecamatan     : Kebayoran Lama
Kota          : Jakarta Selatan
Provinsi      : DKI Jakarta
Kode Pos      : 12210
Koordinat     : -6.221491705726733, 106.78258666947377
```

Dipakai untuk: kalkulasi ongkir & label pengiriman Biteship, alamat yang ditampilkan di footer & halaman `/contact` publik (sejak perbaikan blocker #3/#4), dan (setelah putaran ini) alamat retur di halaman komplain.

## Badan Hukum

| Field | Nilai | Sumber |
|---|---|---|
| Nama badan usaha | **CV. Sentosa Berkat Jaya** | Konstanta `LEGAL_ENTITY_NAME` di `lib/constants/business-identity.ts`, dipakai di footer, About, dan Contact |

Belum ada data NPWP/NIB/akta pendirian yang tersimpan di kode maupun database. Nama rekening bank yang akan didaftarkan ke Midtrans sudah dikonfirmasi cocok dengan KTP pemilik akun (2026-07-04) — dokumen fisik ini murni administratif, di luar codebase.

## Sosial Media & Marketplace

Dari `components/store/store-footer.tsx`:

| Platform | Handle/URL |
|---|---|
| Instagram | `instagram.com/geekytech.id` |
| TikTok | `tiktok.com/@geekytech.id` |
| X (Twitter) | `x.com/geekytech` |

Link marketplace di footer (Tokopedia, Shopee, Blibli, TikTok Shop) masih mengarah ke domain generik platform tersebut (`tokopedia.com`, dst.), bukan ke halaman toko GeekyTech spesifik — di luar scope dokumen ini, dicatat sebagai referensi saja.

## Riwayat Perubahan

- **2026-07-03**: Dokumen dibuat. Domain fallback kode sudah diperbaiki ke `geeky.id` (blocker #5). Alamat & WhatsApp CS sudah dinamis di footer/contact (blocker #3/#4). Email publik sedang diseragamkan ke `support@geeky.id` (item #8).
- **2026-07-04**: Email publik selesai diseragamkan ke `support@geeky.id` di semua halaman (item #8, sisa gap: teks `geekytech.id` di invoice). Nama badan usaha dipindah ke konstanta bersama, ditambahkan ke About/Contact (item #11). `NEXT_PUBLIC_APP_URL` Vercel Production dikonfirmasi `geeky.id`. `settings.whatsapp_cs` diupdate ke nomor asli `6281992283947` (sama dengan `store_origin.phone`). Nama rekening bank dikonfirmasi cocok dengan KTP.
