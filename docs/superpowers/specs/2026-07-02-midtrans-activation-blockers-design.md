# Design: Perbaikan 6 Blocker Aktivasi Midtrans

> Dibuat: 2026-07-02
> Referensi: [docs/audit-midtrans.md](../../audit-midtrans.md) — Bagian 2, temuan #1–#6 (kategori BLOCKER)

## 1. Tujuan

Menutup 6 temuan **blocker** dari audit kesiapan aktivasi Midtrans supaya website GeekyTech tidak ditolak/lama diproses karena alasan "situs tidak dapat diakses" atau "informasi bisnis tidak lengkap" (kriteria B pada dokumentasi Midtrans).

## 2. Scope

**Dikerjakan sekarang (6 blocker):**
1. Link kebijakan pengembalian yang 404 di seluruh halaman legal
2. Duplikasi halaman Syarat & Ketentuan (`/terms` vs `/syarat-ketentuan`)
3. Footer publik live tanpa info kontak
4. Tidak ada alamat bisnis riil di halaman publik manapun
5. Fallback domain salah (`geekytech.com`, seharusnya `geeky.id`)
6. Kemungkinan produk seed placeholder (`placehold.co`) di katalog production

**Eksplisit di luar scope (dikerjakan sesi terpisah):** #7 WhatsApp floating button tidak tayang untuk guest, #8 inkonsistensi domain email, #9 nomor WA placeholder di halaman legal (teks statis), #10 alamat retur placeholder di flow komplain, #11 nama badan hukum belum tampil di halaman selain footer, #12–#13 bug logika webhook Midtrans (fraud challenge & idempotency refund).

**Di luar scope kode sama sekali (tindakan manual pemilik bisnis):** verifikasi `NEXT_PUBLIC_APP_URL` di Vercel Production benar-benar `https://geeky.id`, pengisian data alamat riil di Admin → Settings → Shipping, kecocokan nama rekening bank dengan KTP/dokumen badan usaha saat submit form Midtrans.

## 3. Desain per Area

### A. Konsolidasi Routing Halaman Legal (Blocker #1, #2)

Struktur akhir mengikuti CLAUDE.md (slug Bahasa Indonesia jadi canonical):

| Path | Tindakan |
|---|---|
| `app/(public)/syarat-ketentuan/page.tsx` | **Tetap**, jadi satu-satunya sumber Terms & Conditions. Href internalnya (`/kebijakan-privasi`, `/kebijakan-pengembalian`) ternyata **sudah benar** (dikonfirmasi via `diff` dengan `/terms`) — jadi tidak perlu diubah, tinggal menunggu halaman tujuannya dibuat. Yang perlu diperbaiki: hapus 2 class CSS nyasar `bg-red-500` / `bg-blue-500` yang membuat dua section tampil merah/biru terang (bug tidak disengaja, ketahuan saat diff). Persingkat section 7 "Pengembalian dan Penukaran" jadi ringkasan + link "Baca kebijakan pengembalian lengkap →" ke halaman baru (D), bukan duplikasi teks penuh. |
| `app/(public)/privacy/page.tsx` | **Dipindah** (bukan dihapus) ke `app/(public)/kebijakan-privasi/page.tsx`. Isi dibawa 100%; href internalnya ke `/kebijakan-pengembalian` juga sudah benar, tidak perlu diubah — hanya menunggu halaman tujuan dibuat. |
| `app/(public)/kebijakan-pengembalian/page.tsx` | **Baru**. Isi diekstrak dari section 7 di atas: syarat retur (7 hari, cacat produksi), proses pengajuan, estimasi waktu refund, kontak untuk komplain. Format konsisten dengan halaman legal lain (hero + content section, metadata title/description). |
| `app/(public)/terms/page.tsx` | **Dihapus** — dikonfirmasi via `diff` isinya 99% identik dengan `/syarat-ketentuan` (beda hanya title meta bahasa Inggris dan 2 href yang memang mau diperbaiki). Tidak ada konten unik yang hilang. |
| `app/(public)/privacy/` (folder lama) | **Dihapus** setelah isi dipindah ke `kebijakan-privasi`. |

Referensi internal yang diupdate ke slug baru:
- `components/store/store-footer.tsx` — `FOOTER_DISCOVER`: `/terms`→`/syarat-ketentuan`, `/privacy`→`/kebijakan-privasi`, tambah entri baru "Kebijakan Pengembalian"→`/kebijakan-pengembalian`.
- `components/auth/register-form.tsx` — link checkbox persetujuan saat registrasi (baris ~265, 269).

Redirect permanen ditambahkan di `next.config.ts` (`redirects()`) untuk `/terms`→`/syarat-ketentuan` dan `/privacy`→`/kebijakan-privasi`, supaya bookmark/link lama tidak putus (404) — termasuk untuk kasus reviewer Midtrans yang mungkin sudah membuka URL lama.

### B. Sumber Data Tunggal untuk Info Bisnis (Blocker #3, #4)

Alih-alih hardcode, footer & contact page mengambil data dari tabel `settings` yang sudah ada dan sudah bisa diedit admin:

- **Alamat** ← `settings.store_origin` (field `address`, `city`, `province`, `postal_code`, `lat`, `lng` — sudah dipakai untuk Biteship).
- **Telepon/WA publik** ← `settings.whatsapp_cs` (string nomor, terpisah dari `store_origin.phone` yang untuk label pengiriman).

Refactor pendukung:
- Pindahkan type `StoreOrigin`, `DEFAULT_STORE_ORIGIN`, `parseStoreOrigin` dari `app/admin/(panel)/settings/shipping/_lib/store-origin.ts` ke `lib/settings/store-origin.ts` (relokasi murni, tanpa ubah logic) supaya bisa dipakai kode publik, bukan cuma admin.
- Tambah `lib/settings/queries.ts` berisi dua fungsi kecil untuk dipakai bersama (admin shipping page, footer, contact page):
  - `getStoreOrigin(supabase): Promise<StoreOrigin>`
  - `getWhatsappCs(supabase): Promise<string>`
- Tambah helper `getGoogleMapsUrl(origin: StoreOrigin): string` di `lib/settings/store-origin.ts` — pakai `lat`/`lng` kalau ada, fallback ke URL pencarian alamat berbasis teks.

Perubahan tampilan:
- `components/store/store-footer.tsx` (footer live, dipasang di `app/(public)/layout.tsx`) — tambah blok "Hubungi Kami" berisi alamat + WA dari fungsi di atas. Komponen ini sudah `async`, tinggal tambah satu query.
- `app/(public)/contact/page.tsx` — diubah jadi async Server Component. Field "Lokasi" dan "WhatsApp" pada `contactChannels` diisi dari `getStoreOrigin`/`getWhatsappCs` (bukan lagi hardcode "Jakarta Selatan, Indonesia" dan `+62 812-3456-7890`), dan href "Lihat Peta" pakai `getGoogleMapsUrl`. Field Email & Jam Operasional **tidak diubah** (di luar scope, lihat §2).

Cleanup terkait: `components/layout/footer.tsx` (footer mati, tidak pernah di-import, berisi link 404 ke `/returns`, `/cara-belanja`, `/cookies`) **dihapus** — dikonfirmasi via grep tidak direferensikan di manapun.

**Catatan risiko data**: setelah perubahan ini, alamat/nomor yang tampil ke publik akan selalu mengikuti isi `settings` production. Kalau isinya masih placeholder seed ("Jakarta Selatan" tanpa alamat jalan lengkap), itu perlu diisi ulang manual lewat Admin → Settings → Shipping — bukan sesuatu yang bisa diperbaiki dari kode.

### C. Perbaikan Fallback Domain (Blocker #5)

Dua fallback string diperbaiki dari `geekytech.com` (domain parkir, tidak live) ke `geeky.id` (domain storefront yang benar-benar live), konsisten dengan yang sudah dipakai di seluruh `lib/email/send-*.ts`:

- `app/layout.tsx:30` — `metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://geekytech.com")` → `"https://geeky.id"`
- `lib/email/resend.ts:4` — `FROM_EMAIL` fallback `noreply@geekytech.com` → `noreply@geeky.id`
- `lib/email/resend.ts:7` — `ADMIN_EMAIL` fallback `admin@geekytech.com` → `admin@geeky.id`

Ini hanya memperbaiki nilai default saat env var tidak di-set — tidak menggantikan kebutuhan verifikasi manual `NEXT_PUBLIC_APP_URL` di Vercel Production (lihat §2).

### D. Cleanup Produk Seed Placeholder (Blocker #6)

Sumber: `supabase/migrations/006_seed_products.sql` — 10 produk contoh (Samsung Galaxy A55 5G, iPhone 15 128GB, ASUS VivoBook 15 OLED, iPad Air M2, dll) dengan `product_images.url` berformat `https://placehold.co/800x800/...` (gambar kotak warna + teks, bukan foto asli).

Proses eksekusi (dengan safety check, bukan langsung eksekusi):
1. **Query read-only** ke Supabase production: cari baris di `product_images` dengan `url LIKE '%placehold.co%'`, join ke `products` untuk dapat nama & status.
2. Untuk tiap produk yang ketemu, **cek juga apakah pernah ada `order_items` yang mereferensikan produk itu** (indikasi produk itu bukan seed murni, tapi katalog asli yang kebetulan fotonya belum diganti — kalau begitu solusinya ganti foto, bukan nonaktifkan produk).
3. Laporkan daftar lengkap (nama produk, status transaksi) ke user, minta konfirmasi eksplisit.
4. Setelah dikonfirmasi: set `is_active = false` pada produk yang memang seed murni (bukan `DELETE`) — reversibel.

Tidak menyentuh `next.config.ts` remote pattern `placehold.co` (dibiarkan untuk kebutuhan development/testing lokal, tidak berisiko di production karena hanya whitelist domain gambar, bukan sumber data).

## 4. Verifikasi

Setelah implementasi, jalankan dev server dan cek:
- `/syarat-ketentuan`, `/kebijakan-privasi`, `/kebijakan-pengembalian` render dengan benar dan saling link tanpa 404.
- `/terms` dan `/privacy` redirect (308) ke slug baru.
- Checkbox persetujuan di halaman register mengarah ke slug baru.
- Footer live menampilkan alamat & WA dari settings; halaman `/contact` menampilkan data yang sama (bukan hardcode) dan link "Lihat Peta" berfungsi.
- `components/layout/footer.tsx` sudah tidak ada dan tidak ada import yang error.
- Build TypeScript sukses setelah relokasi `store-origin.ts` (tidak ada import yang putus di admin shipping page).
- Hasil query cleanup produk seed (§3.D) dilaporkan ke user sebelum eksekusi apapun.

## 5. Tindak Lanjut Manual (Bukan Bagian Implementasi Ini)

- Verifikasi `NEXT_PUBLIC_APP_URL` di Vercel Production = `https://geeky.id`.
- Isi/perbarui `settings.store_origin` dan `settings.whatsapp_cs` dengan data riil lewat Admin → Settings, jika belum.
- Siapkan kecocokan nama rekening bank dengan KTP/dokumen badan usaha sebelum submit form aktivasi Midtrans.
- Item #7–#13 dari audit (lihat §2) untuk sesi berikutnya.
