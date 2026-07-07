# Design: Perbaikan Item #12-13 Audit Midtrans — Bug Logika Webhook

> Dibuat: 2026-07-04
> Referensi: [docs/audit-midtrans.md](../../audit-midtrans.md) — Bagian 2, item #12 dan #13
> Melanjutkan: [2026-07-02-midtrans-activation-blockers-design.md](2026-07-02-midtrans-activation-blockers-design.md), [2026-07-03-midtrans-audit-items-7-11-design.md](2026-07-03-midtrans-audit-items-7-11-design.md)

## 1. Tujuan

Menutup 2 temuan bug logika di webhook Midtrans (`app/api/webhooks/midtrans/route.ts`) yang bukan syarat aktivasi, tapi risiko finansial/operasional nyata setelah live: transaksi kartu kredit yang seharusnya direview manual malah otomatis disettle (#12), dan webhook refund yang dikirim ulang oleh Midtrans (perilaku normal at-least-once delivery mereka) memicu duplikasi data (#13).

## 2. Scope

**Dikerjakan sekarang:** #12 (routing capture+challenge), #13 (idempotency `applyRefund`), plus satu perbaikan terkait yang ditemukan saat investigasi dan disetujui user: idempotency guard yang sama untuk `applyChallenge` (fungsi yang sama disentuh untuk #12, punya pola bug identik dengan #13).

**Di luar scope:** perubahan skema database, penambahan test framework baru, perubahan pada `applySettlement`/`applyPending`/`applyCancelOrExpire` (sudah punya guard idempotensi yang benar, tidak perlu disentuh).

## 3. Konteks Teknis

File `app/api/webhooks/midtrans/route.ts` menerima notifikasi POST dari Midtrans, memverifikasi signature (SHA512), lalu merutekan ke salah satu handler (`applySettlement`, `applyPending`, `applyCancelOrExpire`, `applyRefund`, `applyChallenge`) berdasarkan `transaction_status` + `fraud_status`.

Dikonfirmasi dari skema (`supabase/migrations/001_schema.sql`):
- Enum `order_status` (tabel `orders`) hanya punya satu state terminal `'refunded'` — tidak ada tabel/kolom untuk melacak beberapa event refund parsial per order. Idempotency check di level "order sudah refunded" sudah cukup, tidak perlu menangani "refund kedua yang sengaja berbeda".
- Enum `payment_status` (tabel `payments`) punya state `'challenge'` terpisah dari `order_status` — hanya kolom `payments.status` yang berubah saat challenge, `orders.status` tidak disentuh oleh `applyChallenge`.

Pola idempotensi yang sudah benar di file ini (jadi acuan): `applySettlement` membungkus semua efek samping (kurangi stok, buat shipment, kirim notifikasi) dalam `if (order.status === "pending_payment")` — begitu order pindah status, webhook yang sama yang dikirim ulang tidak akan mengulang efek samping. `applyCancelOrExpire` memakai pola serupa (`if (!order || order.status !== "pending_payment") return;`).

## 4. Desain per Item

### #12 — Transaksi `capture` + `fraud_status: "challenge"` salah masuk jalur settlement

**Masalah:** Midtrans mengirim `transaction_status: "capture"` dengan `fraud_status: "challenge"` untuk transaksi kartu yang perlu direview manual oleh Fraud Detection System — bukan `transaction_status: "challenge"` secara literal. Kondisi routing saat ini di `app/api/webhooks/midtrans/route.ts:518-521`:
```ts
if (
  (txStatus === "settlement" || txStatus === "capture") &&
  fraudStatus !== "deny"
) {
  await applySettlement(body.order_id, body);
}
```
`"challenge" !== "deny"` bernilai `true`, jadi transaksi ini lolos ke `applySettlement` — stok dikurangi, shipment dibuat, email "pembayaran dikonfirmasi" terkirim — sebelum manusia menyetujui/menolak di Midtrans Dashboard.

**Perbaikan:** tambah kondisi baru tepat sebelum kondisi settlement, mengarahkan kombinasi `capture` + `challenge` ke `applyChallenge` (fungsi ini sudah ada dan sudah benar secara isi, cuma tidak pernah ter-trigger untuk kasus kartu kredit karena kondisi lama menjebaknya duluan). Kondisi lama untuk `txStatus === "challenge"` literal (baris 533) dibiarkan sebagai fallback untuk channel pembayaran lain yang mungkin memang mengirim status literal itu.

### #13 — `applyRefund` tanpa idempotency guard

**Masalah:** `app/api/webhooks/midtrans/route.ts:315-369` langsung menulis `status: "refunded"`, insert `order_status_history`, dan kirim notifikasi/email setiap kali dipanggil — tanpa mengecek apakah order ini sudah pernah diproses sebagai refund sebelumnya. Karena Midtrans mengirim ulang webhook untuk reliabilitas (at-least-once delivery), pengiriman ulang notifikasi `refund`/`partial_refund` yang sama akan menduplikasi baris histori dan mengirim ulang notifikasi/email ke customer.

**Perbaikan:** tambah early-return di awal fungsi begitu order diketahui sudah berstatus `"refunded"` — mengikuti pola `applyCancelOrExpire` yang sudah ada di file yang sama.

### Bonus — `applyChallenge` idempotency guard

**Masalah (ditemukan saat investigasi #12, disetujui user untuk sekalian dibenahi):** `app/api/webhooks/midtrans/route.ts:371-411` meng-update `payments.status` dengan guard `.eq("status", "pending")` (baik), tapi insert `order_status_history` dan kirim notifikasi **tidak bergantung pada hasil update itu** — keduanya tetap jalan meski update tidak mengenai baris manapun (karena status sudah "challenge" dari webhook sebelumnya). Kalau Midtrans kirim ulang webhook "challenge" sebelum admin sempat approve/deny, ini akan menduplikasi histori dan notifikasi.

**Perbaikan:** ambil hasil UPDATE lewat `.select("id").maybeSingle()`, dan hanya lanjut ke insert histori/notifikasi kalau update benar-benar mengenai satu baris (`updatedPayment` tidak `null`).

## 5. File yang Terpengaruh

| File | Perubahan |
|---|---|
| `app/api/webhooks/midtrans/route.ts` | 1 kondisi baru di `POST` handler (#12); early-return di `applyRefund` (#13); guard berbasis hasil UPDATE di `applyChallenge` (bonus) |

Tidak ada file lain yang berubah. Tidak ada migrasi database baru.

## 6. Verifikasi

Repo ini tidak punya test framework otomatis, dan perubahan ini ada di webhook (server-to-server), bukan sesuatu yang bisa dicek langsung di browser. Project ini juga cuma punya **satu** Supabase project (production, `xvgcmqpnrloqbneacdpx`) — tidak ada environment staging terpisah.

Pendekatan verifikasi (disepakati dengan user): buat 1 order + 1 payment dummy langsung lewat SQL (`order_number = "TEST-WEBHOOK-<timestamp>"`, `user_id = NULL` supaya tidak ada email/notifikasi terkirim ke user asli), kirim request POST ke `http://localhost:3000/api/webhooks/midtrans` dengan signature valid (dihitung dari `MIDTRANS_SERVER_KEY` di `.env.local` lokal) untuk 4 skenario, cek hasilnya lewat query SQL, lalu **hapus baris test-nya** setelah selesai — tidak boleh ada jejak permanen di database production.

4 skenario yang harus diverifikasi:
1. `capture` + `fraud_status: "challenge"` (pertama kali) → `payments.status` jadi `"challenge"`, **stok produk tidak berkurang**, **tidak ada baris baru di tabel `shipments`**, 1 baris baru di `order_status_history`.
2. Kirim ulang payload yang sama persis dari skenario 1 → tidak ada baris `order_status_history` baru, tidak ada perubahan lain (no-op).
3. `refund` pada order yang belum pernah di-refund → `orders.status` dan `payments.status` jadi `"refunded"`, 1 baris baru di `order_status_history`.
4. Kirim ulang payload yang sama persis dari skenario 3 → tidak ada baris `order_status_history` baru (no-op).

Ditambah verifikasi standar: `npx tsc --noEmit` bersih, `npx eslint app/api/webhooks/midtrans/route.ts` tidak ada error baru (bukan `npm run lint` project-wide — ada ribuan lint error pre-existing tidak terkait).

## 7. Tindak Lanjut Manual (Bukan Bagian Implementasi Ini)

Tidak ada — kedua item ini murni perbaikan kode, tidak memerlukan tindakan manual di luar deploy.
