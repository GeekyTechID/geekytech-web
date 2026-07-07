# Design: Perbaikan Item #7-11 Audit Midtrans

> Dibuat: 2026-07-03
> Referensi: [docs/audit-midtrans.md](../../audit-midtrans.md) — Bagian 2, kategori "Perlu Diperhatikan" #7, #8, #9, #10, #11
> Referensi data: [docs/geeky-datal.md](../../geeky-datal.md)
> Melanjutkan: [2026-07-02-midtrans-activation-blockers-design.md](2026-07-02-midtrans-activation-blockers-design.md) (6 blocker, sudah selesai & live di `development`)

## 1. Tujuan

Menutup 5 temuan kategori "Perlu Diperhatikan" dari audit Midtrans yang bukan blocker aktivasi, tapi melemahkan kesan kelengkapan info bisnis dan konsistensi kontak di mata reviewer maupun pengunjung asli.

## 2. Scope

**Dikerjakan sekarang:** #7 (chat untuk guest), #8 (domain email konsisten), #9 (nomor WA dinamis di halaman legal/FAQ), #10 (alamat retur dinamis), #11 (nama badan usaha di halaman publik).

**Eksplisit di luar scope (sesi terpisah):** #12 (bug fraud-review webhook Midtrans) dan #13 (idempotency `applyRefund`) — keduanya bug logika pembayaran dengan risiko finansial nyata, sengaja dipisah untuk desain & review yang lebih ketat.

**Di luar scope kode sama sekali (tindakan manual):** mengisi nilai asli `settings.whatsapp_cs` (masih placeholder seed di production) — lihat [docs/geeky-datal.md](../../geeky-datal.md) untuk detail dan rekomendasi.

## 3. Desain per Item

### #7 — ChatWidget tampil untuk guest, arahkan ke login

`components/chat/chat-widget.tsx` saat ini `return null` total kalau `!user` (baris 60), jadi pengunjung anonim tidak melihat tombol kontak apapun. WhatsApp floating button (`components/layout/whatsapp-button.tsx`, dead code) **tidak dihidupkan kembali** — sesuai keputusan: chat yang sudah ada cukup.

Perubahan:
- Hapus early-return `if (!user) return null`. Tombol mengambang "Chat CS" selalu tampil untuk semua pengunjung.
- Saat panel dibuka (`isOpen`) dan `!user`: render panel ringkas berisi ajakan "Masuk untuk mulai chat dengan tim kami" + tombol ke `/login?redirectTo={pathname}` (pakai `usePathname()` dari `next/navigation`, pola yang sama seperti redirect di `app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx:45`).
- Saat `user` ada: perilaku persis seperti sekarang (`ChatSessionForm` / `ChatPopup`), tidak berubah.
- `useEffect` fetch `/api/chat/sessions` sudah menjaga `if (!user) return;` — tidak perlu diubah, aman untuk guest (tidak ada fetch percuma).

Tidak ada perubahan skema database atau backend chat — murni penyesuaian tampilan client component ini.

### #8 — Domain email konsisten (perbaikan literal)

Ganti semua kemunculan `support@geekytech.com` → `support@geeky.id` (8 kemunculan di 5 file: `app/(public)/contact/page.tsx` ×2, `app/(public)/syarat-ketentuan/page.tsx` ×1, `app/(public)/kebijakan-privasi/page.tsx` ×1, `app/(public)/kebijakan-pengembalian/page.tsx` ×1, `app/(public)/faq/page.tsx` ×2).

Sekalian dibenahi karena searah (bukan penambahan scope, cuma domain yang salah): `lib/geo/geocode-destination.ts:145` (User-Agent header ke Nominatim: `geekytech.com` → `geeky.id`) dan `app/admin/login/page.tsx:115` (placeholder form: `admin@geekytech.com` → `admin@geeky.id`).

Tidak ada infrastruktur baru (tidak ada field `settings.support_email`) — sesuai keputusan, email ini dianggap tetap/jarang berubah.

### #9 — Nomor WhatsApp dinamis di halaman legal & FAQ

3 halaman legal (`syarat-ketentuan`, `kebijakan-privasi`, `kebijakan-pengembalian`) dan halaman FAQ punya bagian "Hubungi Kami" yang masih hardcode `+62 812-3456-7890`. Pola perbaikan sama seperti `/contact` di putaran sebelumnya (Task 5): ubah komponen jadi async Server Component, fetch `getWhatsappCs()` dari `@/lib/settings/queries` (sudah ada, tidak perlu diubah), pindahkan array konten (`sections` / `faqCategories`) ke dalam body function supaya bisa menyisipkan nilai dinamis.

Untuk 3 halaman legal: baris `"WhatsApp: +62 812-3456-7890"` di array `sections` menjadi `` `WhatsApp: +62 ${whatsappCs}` `` (atau `"WhatsApp: Belum diatur"` kalau `whatsappCs` kosong).

Untuk FAQ (`app/(public)/faq/page.tsx`, 228 baris `faqCategories`): hanya 2 dari puluhan entry berisi kontak (`other-1` baris 206, `other-3` baris 218) yang perlu field dinamis; sisanya identik.

⚠️ **Catatan sudah dikonfirmasi ke user**: `settings.whatsapp_cs` di production masih berisi nilai placeholder (`6281234567890`, lihat [docs/geeky-datal.md](../../geeky-datal.md)). Setelah perubahan ini deploy, keempat halaman ini akan menampilkan nomor placeholder itu apa adanya sampai admin mengisi nilai asli — ini bukan bug kode, murni menunggu data diisi lewat Admin → Settings.

### #10 — Alamat retur dinamis di halaman komplain

`app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx:65` — ganti:
```ts
const returnAddress = "Jl. Contoh No. 123, Jakarta";
```
menjadi fetch `getStoreOrigin()` dari `@/lib/settings/queries` lalu `getStoreOriginFullAddress(origin)` dari `@/lib/settings/store-origin` (keduanya sudah ada dari putaran sebelumnya, tidak perlu diubah). Halaman ini sudah `async` (sudah fetch data lain), tinggal tambah satu fetch lagi.

Alamat asli di `settings.store_origin` sudah lengkap terisi di production (lihat [docs/geeky-datal.md](../../geeky-datal.md)), jadi begitu deploy langsung menampilkan data benar tanpa perlu tindakan tambahan.

### #11 — Nama badan usaha di About & Contact

Nama badan usaha "CV. Sentosa Berkat Jaya" saat ini hanya hardcode di `components/store/store-footer.tsx` (baris copyright), dan bukan berasal dari `settings.store_origin.name` (yang isinya cuma `"GeekyTech"`, bukan nama badan usaha — field berbeda konsep).

Perubahan:
- Buat `lib/constants/business-identity.ts` (mengikuti pola file kecil yang sudah ada di `lib/constants/`, mis. `order-status-labels.ts`) berisi:
  ```ts
  export const LEGAL_ENTITY_NAME = "CV. Sentosa Berkat Jaya";
  ```
- `components/store/store-footer.tsx`: ganti string hardcode di baris copyright dengan `LEGAL_ENTITY_NAME` (refactor kecil, satu sumber kebenaran).
- `app/(public)/about/page.tsx`: tambah satu baris kecil "Dioperasikan oleh {LEGAL_ENTITY_NAME}" tepat di bawah paragraf deskripsi pada Hero section (sebelum section stats).
- `app/(public)/contact/page.tsx`: tambah baris kecil yang sama, tepat di bawah paragraf deskripsi pada Hero section (konsisten dengan penempatan di About) — bukan bagian dari `contactChannels` yang sudah ada.

Ini konstanta statis, bukan dari `settings` — sesuai keputusan (nama badan usaha jarang berubah, tidak perlu infrastruktur admin-editable).

## 4. File yang Terpengaruh

| File | Perubahan |
|---|---|
| `components/chat/chat-widget.tsx` | Hapus guard `!user`, tambah guest-mode panel |
| `app/(public)/syarat-ketentuan/page.tsx` | Async + WA dinamis + email diperbaiki |
| `app/(public)/kebijakan-privasi/page.tsx` | Async + WA dinamis + email diperbaiki |
| `app/(public)/kebijakan-pengembalian/page.tsx` | Async + WA dinamis + email diperbaiki |
| `app/(public)/faq/page.tsx` | Async + WA dinamis + email diperbaiki (2 entry) |
| `app/(public)/contact/page.tsx` | Email diperbaiki, tambah baris nama badan usaha |
| `app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx` | Alamat retur dinamis |
| `app/admin/login/page.tsx` | Placeholder email diperbaiki |
| `lib/geo/geocode-destination.ts` | User-Agent domain diperbaiki |
| `lib/constants/business-identity.ts` | **Baru** — konstanta nama badan usaha |
| `components/store/store-footer.tsx` | Pakai `LEGAL_ENTITY_NAME`, tidak lagi hardcode |
| `app/(public)/about/page.tsx` | Tambah baris nama badan usaha |

Tidak ada perubahan skema database, tidak ada endpoint API baru, tidak ada dependency baru.

## 5. Verifikasi

Repo ini tidak punya test runner otomatis — verifikasi lewat `npx tsc --noEmit`, `npx eslint <file yang diubah>` (bukan `npm run lint` project-wide, ada ribuan lint error pre-existing tidak terkait), `npm run build`, dan pengecekan manual di browser:
- Guest (belum login) buka situs manapun → tombol Chat CS tetap tampil → klik → muncul ajakan login, tombol login mengarah balik ke halaman asal via `redirectTo`.
- Login sebagai user biasa → chat tetap berfungsi seperti sebelumnya.
- Buka `/syarat-ketentuan`, `/kebijakan-privasi`, `/kebijakan-pengembalian`, `/faq` → email `support@geeky.id`, WhatsApp menampilkan nilai dari `settings.whatsapp_cs` (saat ini placeholder, itu wajar).
- Buka halaman komplain (order dengan status `return_approved` + retur `pending_shipback`) → alamat retur menampilkan alamat asli dari `settings.store_origin`, bukan lagi "Jl. Contoh No. 123, Jakarta".
- Buka `/about` dan `/contact` → ada baris "Dioperasikan oleh CV. Sentosa Berkat Jaya"; footer tetap menampilkan nama yang sama (dari constant, bukan hardcode terpisah lagi).

## 6. Tindak Lanjut Manual (Bukan Bagian Implementasi Ini)

- Isi `settings.whatsapp_cs` dengan nomor WhatsApp CS asli lewat Admin → Settings (cek dulu apakah `6281992283947` — nomor telepon di `store_origin` — adalah nomor yang sama).
- Item #12 dan #13 (bug logika webhook Midtrans) untuk sesi terpisah.
