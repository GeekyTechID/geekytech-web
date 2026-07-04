# Laporan Audit Kesiapan Aktivasi Midtrans — GeekyTech

> Dibuat: 2026-07-01 · Status diperbarui: 2026-07-04
> Sumber dokumentasi yang diaudit:
> - https://docs.midtrans.com/docs/saya-mendapatkan-error-phone-number-or-email-address-has-been-taken-apa-yang-harus-saya-lakukan
> - https://docs.midtrans.com/docs/hal-yang-perlu-diperhatikan-untuk-menghindari-kendala-saat-proses-aktivasi-akun
> - https://docs.midtrans.com/docs/mengapa-pengajuan-aktivasi-saya-ditolak

## Status Perbaikan (Bagian 2)

Semua 13 temuan selesai.

- ✅ Blocker #1-6 — lihat [2026-07-02-midtrans-activation-blockers.md](superpowers/plans/2026-07-02-midtrans-activation-blockers.md)
- ✅ Perlu Diperhatikan #7-11 — lihat [2026-07-03-midtrans-audit-items-7-11.md](superpowers/plans/2026-07-03-midtrans-audit-items-7-11.md)
- ✅ Perlu Diperhatikan #12-13 (bug webhook) — lihat [2026-07-04-midtrans-webhook-fixes.md](superpowers/plans/2026-07-04-midtrans-webhook-fixes.md)
- Referensi data bisnis (email, WA, alamat) terkini: [geeky-datal.md](../geeky-datal.md)
- Ketiga tindak lanjut manual (Vercel `NEXT_PUBLIC_APP_URL`, `settings.whatsapp_cs`, kecocokan nama rekening) sudah dikonfirmasi selesai per 2026-07-04 — lihat §3.
- Tidak ada gap tersisa. Semua 13 temuan + tindak lanjut manual selesai per 2026-07-04.

## 1. Ringkasan: Penyebab Aktivasi Ditolak/Lama Menurut Dokumentasi Midtrans

**A. Email/nomor telepon sudah pernah terdaftar (paling sering jadi penyebab)**
Email/nomor telepon bisnis tidak boleh pernah dipakai untuk akun Midtrans lain ATAU akun GoJek/GoBiz/GoFood/GoPay manapun. Tidak ada workaround untuk nomor telepon; untuk email hanya Gmail/Outlook yang bisa pakai trik `+1`.
Sumber: `docs.midtrans.com/docs/saya-mendapatkan-error-phone-number-or-email-address-has-been-taken...`, `.../hal-yang-perlu-diperhatikan-untuk-menghindari-kendala-saat-proses-aktivasi-akun`

**B. Website/aplikasi tidak bisa diakses atau tidak lengkap**
Situs harus aktif, bisa diakses publik (bukan maintenance/localhost/preview terkunci), sesuai kategori bisnis yang didaftarkan, info produk jelas & lengkap, dan **wajib menampilkan harga dalam IDR**.
Sumber: `docs.midtrans.com/docs/mengapa-pengajuan-aktivasi-saya-ditolak`, `.../apa-saja-kriteria-situs-web-atau-aplikasi-untuk-melakukan-registrasi-akun-midtrans`

**C. Dokumen tidak valid/tidak sesuai ketentuan, terutama ketidaksesuaian nama rekening**
Nama pemilik rekening bank harus **sama persis** dengan nama di KTP/KITAS dan dengan data di bank. Jika tidak, wajib lampirkan foto buku tabungan — ini menambah ronde review dan memperlama proses.
Sumber: `docs.midtrans.com/docs/hal-yang-perlu-diperhatikan-untuk-menghindari-kendala-saat-proses-aktivasi-akun`

**D. Proses upload dokumen yang terburu-buru**
Upload dokumen harus satu per satu, tunggu sampai selesai sebelum lanjut; upload beruntun bisa membuat proses macet dan harus reload + ulang dari awal.
Sumber: sama seperti poin C

**E. Kesalahan format data pada form pendaftaran**
URL harus format penuh (`https://www.` atau `www.`), email tanpa spasi, nama field hanya boleh pakai simbol `. , ' " -`, nomor telepon hanya digit setelah +62/0 tanpa spasi/strip.
Sumber: sama seperti poin C

**F. Kategori bisnis terlarang / barang melanggar HKI**
Narkotika, pornografi, judi online, barang palsu/HKI, senjata/bahan berbahaya, gesek tunai, skema Ponzi, dll.
Sumber: `docs.midtrans.com/docs/apakah-semua-tipe-bisnis-dapat-menerima-pembayaran-melalui-midtrans`

**G. Mendaftar hanya dengan katalog produk (tanpa website/app hidup)**
Konsekuensinya metode pembayaran dibatasi hanya VA (Permata/BNI/BRI/Mandiri) + QRIS + GoPay — tanpa kartu kredit.
Sumber: `docs.midtrans.com/docs/apakah-saya-harus-memiliki-situs-web-untuk-aktivasi-akun-midtrans`

---

## 2. Temuan di Project GeekyTech

### 🔴 BLOCKER — Wajib diperbaiki sebelum ajukan aktivasi

**1. Tidak ada URL kebijakan pengembalian/refund yang hidup — semua link 404** ✅ *Selesai — commit `eaded95`*
Setiap link yang seharusnya mengarah ke halaman kebijakan pengembalian gagal:
- `components/layout/footer.tsx:14-27` → link ke `/cara-belanja` dan `/returns` → 404 (tapi ini bukan footer yang benar-benar tayang, lihat temuan #3)
- `app/(public)/terms/page.tsx:205-221` → link ke `/returns` → 404
- `app/(public)/syarat-ketentuan/page.tsx:205-221` → link ke `/kebijakan-privasi` dan `/kebijakan-pengembalian` → 404
- `app/(public)/privacy/page.tsx:196-211` → link ke `/kebijakan-pengembalian` → 404

Kaitan ke kriteria Midtrans: reviewer Midtrans yang klik-tembus dari footer/halaman legal akan menabrak 404 — ini persis kriteria **"situs web tidak dapat diakses"** (poin B) pada `docs.midtrans.com/docs/mengapa-pengajuan-aktivasi-saya-ditolak`. Konten kebijakan pengembalian sebenarnya sudah ada (terduplikasi di dalam `/terms` dan `/syarat-ketentuan` sebagai section 7 "Pengembalian dan Penukaran"), tinggal diekstrak jadi halaman sendiri dengan URL yang konsisten.

**2. Dua URL berbeda untuk konten Terms & Conditions yang identik, saling silang-tautkan salah** ✅ *Selesai — commit `335213a`*
`app/(public)/terms/page.tsx` dan `app/(public)/syarat-ketentuan/page.tsx` isinya hampir sama tapi masing-masing menaut ke target berbeda (dan keduanya patah). Ini memperbesar risiko poin B di atas dan bikin maintenance rawan drift.

**3. Live footer publik (`components/store/store-footer.tsx`, dipasang di `app/(public)/layout.tsx:51`) tidak punya info kontak sama sekali** ✅ *Selesai — commit `2830345`* — tidak ada telepon, email, atau alamat. File `components/layout/footer.tsx` yang berisi link (termasuk yang 404 di atas) ternyata **dead code, tidak pernah di-import**. Jadi footer yang benar-benar tayang justru lebih minim, bukan cuma broken link.
Kaitan Midtrans: kriteria "informasi bisnis jelas dan lengkap" pada `apa-saja-kriteria-situs-web-atau-aplikasi...` tidak terpenuhi di elemen yang tampil di setiap halaman publik.

**4. Tidak ada alamat bisnis yang riil/terverifikasi di halaman publik manapun** ✅ *Selesai — commit `2830345`*
`app/(public)/contact/page.tsx:28-35` — field "Lokasi" hanya berisi `"Jakarta Selatan, Indonesia"` (bukan alamat jalan) dengan link `href="#"` yang tidak ke mana-mana ("Lihat Peta" tidak berfungsi). Alamat asli hanya ada di setting admin `store_origin` (`app/admin/(panel)/settings/shipping/_components/origin-form.tsx`) untuk kalkulasi ongkir Biteship, tidak pernah disurface ke publik.
Kaitan Midtrans: dokumen legalitas bisnis (poin C) yang diajukan ke Midtrans mencantumkan alamat — kalau tidak ada korespondensi publik, ini melemahkan verifikasi identitas bisnis dan berisiko masuk kategori "dokumen tidak valid/sesuai ketentuan".

**5. Domain produksi yang benar-benar live adalah `geeky.id`, bukan `geekytech.com`** ✅ *Selesai — fallback kode diperbaiki (commit `171aff6`), `NEXT_PUBLIC_APP_URL` di Vercel Production dikonfirmasi sudah `geeky.id`.*
`https://geekytech.com` hanya menampilkan halaman parkir yang redirect ke `/lander` (bukan toko), sedangkan `https://geeky.id` adalah storefront asli yang berfungsi. Namun beberapa fallback default di kode masih mengarah ke domain yang salah:
- `app/layout.tsx:30` → `metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://geekytech.com")`
- `lib/email/resend.ts:4,7` → fallback `noreply@geekytech.com` / `admin@geekytech.com`

Kaitan Midtrans: kalau URL yang diajukan ke form registrasi Midtrans ternyata `geekytech.com` (bukan `geeky.id`), reviewer akan mendarat di halaman parkir kosong — cocok persis dengan kriteria **"situs web tidak dapat diakses"**. Ini adalah item verifikasi paling bernilai tinggi sebelum submit, independen dari perbaikan kode.

**6. Kemungkinan produk seed dengan gambar placeholder ikut masuk katalog live** ✅ *Sudah dicek — semua 10 produk seed sudah `is_active = false` sejak 2026-05-25, tidak ada order asli, tidak perlu aksi tambahan.*
`supabase/migrations/006_seed_products.sql` (baris 42, 67, 90, 114, 138, 162, 186, 209...) menyisipkan 10 produk contoh (Galaxy A55, iPhone 15, VivoBook 15, dll) dengan `product_images.url` berupa `https://placehold.co/800x800/...` — kotak warna bertuliskan teks, bukan foto asli. `next.config.ts:27` bahkan mewhitelist `placehold.co` dengan komentar mengaku ini "development (seed data)", tanpa migrasi lanjutan yang menghapusnya.
Kaitan Midtrans: kalau migrasi ini pernah dijalankan di Supabase project produksi, produk-produk placeholder ini akan tampil bersanding dengan 107 produk asli — melanggar kriteria "informasi produk/jasa jelas dan lengkap" (poin B).
**Aksi konkret**: query tabel `products`/`product_images` untuk baris dengan URL `placehold.co`, hapus/nonaktifkan sebelum submit.

### 🟡 PERLU DIPERHATIKAN

**7. WhatsApp CS floating button (disyaratkan CLAUDE.md) tidak pernah tayang** ✅ *Selesai — bukan WhatsApp button, tapi Chat CS sekarang tampil untuk guest & arahkan ke login. Commit `1a8a0be`.*
`components/layout/whatsapp-button.tsx` adalah dead code, tidak pernah dirender. Yang tayang adalah `ChatWidget` (`components/chat/chat-widget.tsx`), tapi widget ini **return `null` untuk user yang belum login** (baris 60: `if (!user) return null;`). Artinya reviewer/pengunjung anonim tidak melihat tombol kontak apapun. Bukan blocker langsung menurut kriteria Midtrans tertulis, tapi melemahkan kesan "informasi bisnis lengkap" dan bertentangan dengan aturan proyek sendiri.

**8. Inkonsistensi domain email di seluruh halaman publik vs domain pengiriman email asli** ✅ *Selesai penuh — `support@geekytech.com` diseragamkan ke `support@geeky.id` di semua halaman publik (commit `e2aac0a`, `3e8d241`, `bc1a54e`), dan teks "geekytech.id" di invoice diseragamkan ke `geeky.id` (commit `8d4b065`).*
`support@geekytech.com` dipakai di `/contact`, `/faq`, `/privacy`, `/terms`, `/syarat-ketentuan`, tapi `RESEND_FROM_EMAIL`/`RESEND_ADMIN_EMAIL` di `.env.local` sebenarnya `admin@geeky.id`, dan invoice (`components/dashboard/invoice-print-view.tsx`) memakai `geekytech.id`. Tiga domain berbeda (`geekytech.com`, `geeky.id`, `geekytech.id`) untuk satu identitas brand. Jika reviewer Midtrans mengirim email ke `support@geekytech.com` seperti yang tertulis di situs, kemungkinan tidak ada yang menerimanya.

**9. Nomor WhatsApp dan alamat yang tampil terlihat seperti data placeholder yang belum diganti** ✅ *Selesai penuh — nomor WA & alamat di `/contact`, footer, halaman legal, dan FAQ dinamis dari `settings` (commit `2830345`, `e2aac0a`, `3e8d241`). `settings.whatsapp_cs` sudah diupdate ke nomor asli `6281992283947` (2026-07-04) — sama dengan nomor di `store_origin.phone`, dikonfirmasi user.*
`app/(public)/contact/page.tsx` hardcode `+62 812-3456-7890` (`wa.me/6281234567890`) — pola digit berurutan yang identik dengan placeholder `NEXT_PUBLIC_WHATSAPP_NUMBER`/`BITESHIP_SHIPPER_PHONE` di `.env.local` dan placeholder di form admin shipping. Sepertinya belum diganti data asli.

**10. Alamat pengembalian barang di flow komplain juga masih placeholder** ✅ *Selesai — commit `b9bac72`*
`app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx:65` — `returnAddress = "Jl. Contoh No. 123, Jakarta"` (literal "Example St. No. 123") ditampilkan ke customer sungguhan sebagai alamat retur, padahal seharusnya diambil dari `settings.store_origin` yang sudah ada di admin shipping. Ini bug fungsional, bukan langsung soal Midtrans, tapi berhubungan dengan tema "informasi bisnis konkret/lengkap" yang sama.

**11. Tidak ada nama badan hukum (PT/CV) yang disebut di halaman publik manapun** ✅ *Selesai — nama badan usaha dipindah ke konstanta bersama, ditambahkan di About & Contact. Commit `6798cc3`, `bc1a54e`, `e3e56cf`.*
Grep untuk `PT `, `CV `, `NPWP`, `akta pendirian`, `NIB` di seluruh repo hanya menemukan referensi di dokumen spek internal (`docs/superpowers/specs/2026-05-28-invoice-design.md:248`), bukan di halaman publik. Semua halaman (`/about`, `/contact`, `/terms`, `/privacy`) hanya menyebut nama dagang "GeekyTech". Jika Midtrans didaftarkan atas nama badan usaha (PT/CV), nama itu sebaiknya juga tampil publik agar konsisten dengan dokumen legalitas dan nama rekening yang diverifikasi (kriteria C).

**12. Bug logika fraud-review kartu kredit di webhook Midtrans (bukan syarat aktivasi, tapi risiko finansial nyata setelah aktif)** ✅ *Selesai — commit `315d69f`, diverifikasi live end-to-end dengan order dummy (dihapus setelah tes)*
`app/api/webhooks/midtrans/route.ts:518-521` — kondisi `(txStatus === "settlement" || txStatus === "capture") && fraudStatus !== "deny"` membuat transaksi `capture` dengan `fraud_status: "challenge"` (transaksi kartu yang perlu direview manual oleh Fraud Detection System) justru diproses sebagai **settlement** — stok dikurangi, shipment dibuat, customer dikira sudah bayar — sebelum manusia menyetujui/menolaknya di dashboard Midtrans. Cabang `challenge` yang sudah ada di baris 533 tidak pernah tercapai untuk transaksi kartu karena Midtrans melaporkan status kartu yang di-challenge sebagai `capture` + `fraud_status: "challenge"`, bukan `transaction_status: "challenge"`. Ini tidak menghalangi aktivasi, tapi sebaiknya diperbaiki sebelum menerima pembayaran kartu kredit sungguhan.

**13. `applyRefund` tanpa idempotency guard** ✅ *Selesai — commit `315d69f`, sekalian dibenahi `applyChallenge` (bug sejenis, ditemukan saat investigasi #12)*
`app/api/webhooks/midtrans/route.ts:315-369` (khususnya baris 326-329, 338-341) — tidak ada pengecekan status sebelum menulis `status: "refunded"`, tidak ada `.eq("status", ...)` seperti handler lain. Webhook refund yang dikirim ulang oleh Midtrans akan menduplikasi baris `order_status_history` dan mengirim ulang notifikasi/email. Bug moderat, tidak terkait aktivasi.

### ✅ SUDAH SESUAI

**14. Verifikasi signature webhook Midtrans — sesuai**
`app/api/webhooks/midtrans/route.ts:32-43` menghitung `SHA512(order_id + status_code + gross_amount + server_key)` dengan benar dan mem-verifikasinya (baris 500-513) **sebelum** ada mutasi database apapun.

**15. Semua 7 status transaksi Midtrans ditangani**
`pending`, `settlement`, `capture` (dengan guard fraud_status), `deny`, `expire`, `cancel`, `challenge` semua ada di `route.ts:515-535`, plus bonus `refund`/`partial_refund`.

**16. Pakai Snap (bukan Core API) untuk membuat transaksi — sesuai aturan CLAUDE.md**
`app/api/checkout/create/route.ts:330-374` memakai `midtrans-client` `Midtrans.Snap` class, dan token dipakai di `window.snap.pay()` (`components/checkout/checkout-page-client.tsx:400`). Panggilan REST langsung ke `/v2/...` hanya dipakai untuk status/cancel/refund, yang memang wajar walau berbasis Snap.

**17. `MIDTRANS_SERVER_KEY` tidak pernah bocor ke client**
Dikonfirmasi hanya dibaca di file server-side (`lib/midtrans/cancel-transaction.ts`, `refund-transaction.ts`, `app/api/checkout/create/route.ts`, `app/api/webhooks/midtrans/route.ts`, `app/api/orders/[id]/verify-payment/route.ts`, dan satu Server Component). `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` (yang memang dirancang publik) satu-satunya yang dikirim ke browser.

**18. Perbaikan bug redirect origin/localhost sudah dilakukan di layer auth**
Commit `f0eafb5` dan `68e9d90` sudah memperbaiki `app/auth/callback/route.ts`, `app/api/auth/register/route.ts`, `app/api/auth/resend-activation/route.ts` agar memakai `NEXT_PUBLIC_APP_URL` dulu sebelum fallback ke origin request — pola ini benar untuk mencegah link mengarah ke localhost/127.0.0.1 di balik reverse proxy cPanel.

**19. Konten legal (Terms, Privacy, FAQ, About) bukan placeholder**
Tidak ditemukan lorem ipsum atau teks "TODO"/"coming soon" di `/terms`, `/privacy`, `/faq`, `/about`. Isinya spesifik untuk bisnis GeekyTech (menyebut 107 produk, 3.565 pelanggan, 23.000+ transaksi, migrasi dari Tokopedia) dan cukup lengkap (14 bagian Terms, 12 bagian Privacy, 6 kategori FAQ).

**20. Alur checkout menampilkan rincian harga dalam IDR secara konsisten**
`lib/format.ts` memakai `Intl.NumberFormat("id-ID", { currency: "IDR" })` di semua tempat harga dirender. Ringkasan order sebelum bayar (`components/checkout/checkout-page-client.tsx:626-753`) memecah subtotal, diskon, ongkir, biaya layanan, dan total — sesuai kriteria "harga dalam IDR" pada dokumentasi Midtrans.

---

## 3. Rekomendasi Langkah Selanjutnya (Urut Prioritas)

1. ✅ **Verifikasi manual di Vercel dashboard** — dikonfirmasi user, `NEXT_PUBLIC_APP_URL` Production sudah `https://geeky.id`.
2. ✅ **Perbaiki seluruh link kebijakan pengembalian** — selesai, commit `eaded95`.
3. ✅ **Hapus duplikasi Terms** — selesai, commit `335213a`.
4. ✅ **Bersihkan produk seed placeholder** — dicek, semua sudah `is_active = false`, tidak perlu aksi.
5. ✅ **Tambahkan alamat bisnis riil** — selesai, commit `2830345`.
6. ✅ **Satukan domain kontak** — selesai penuh untuk email publik dan invoice, commit `171aff6`, `e2aac0a`, `3e8d241`, `bc1a54e`, `8d4b065`.
7. ✅ **Ganti nomor WhatsApp/telepon placeholder** — kode dinamis (commit `2830345`, `e2aac0a`, `3e8d241`), `settings.whatsapp_cs` diupdate 2026-07-04 ke `6281992283947` (dikonfirmasi sama dengan `store_origin.phone`).
8. ✅ **Perbaiki `returnAddress` placeholder** — selesai, commit `b9bac72`.
9. ✅ **Cek kecocokan nama rekening bank** — dikonfirmasi user, nama rekening sudah sama dengan KTP.
10. ✅ **Perbaiki bug non-blocking di webhook** — selesai, commit `315d69f`: routing `capture`+`challenge` diarahkan ke `applyChallenge`, idempotency guard ditambahkan di `applyRefund` dan `applyChallenge`.
