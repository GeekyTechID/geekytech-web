# Perbaikan Bug Webhook Midtrans (Item #12-13) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perbaiki 2 bug logika + 1 bug terkait di webhook Midtrans (`app/api/webhooks/midtrans/route.ts`): transaksi kartu yang perlu review manual (`capture`+`fraud_status: challenge`) salah masuk jalur settlement otomatis (#12), dan 2 handler (`applyRefund`, `applyChallenge`) tidak idempoten terhadap webhook yang dikirim ulang oleh Midtrans (#13 + bonus).

**Architecture:** 3 perubahan presisi kecil di satu file yang sama, mengikuti pola idempotensi yang sudah dipakai di fungsi lain di file yang sama (`applySettlement`, `applyCancelOrExpire`). Tidak ada perubahan skema, tidak ada dependency baru.

**Tech Stack:** Next.js 16 App Router API Route + TypeScript (strict), Supabase Postgres (service role client). **Tidak ada test runner otomatis di proyek ini**, dan project ini **hanya punya satu Supabase project (production, `xvgcmqpnrloqbneacdpx`)** — tidak ada environment staging terpisah. Verifikasi memakai `npx tsc --noEmit` + `npx eslint` di-scope ke file yang diubah, **plus** pengujian end-to-end nyata: kirim request HTTP ke webhook lokal dengan payload & signature valid terhadap 1 order dummy yang dibuat khusus untuk ini, lalu dihapus setelah selesai.

## Global Constraints

- Jangan ubah `applySettlement`, `applyPending`, `applyCancelOrExpire` — sudah punya guard idempotensi yang benar, di luar scope.
- Jangan tambah skema/kolom/tabel baru.
- Signature Midtrans dihitung sebagai `SHA512(order_id + status_code + gross_amount + server_key)` — HANYA bergantung pada 3 field itu, TIDAK bergantung pada `transaction_status`/`fraud_status`. Artinya satu signature bisa dipakai ulang untuk beberapa skenario request selama `order_id`/`status_code`/`gross_amount` sama persis.
- **Jangan pernah print/log/tulis nilai `MIDTRANS_SERVER_KEY` mentah ke laporan, terminal output, atau file manapun** — hanya boleh dipakai secara transien di dalam proses yang menghitung signature.
- Order/payment dummy untuk pengujian **wajib** dihapus di akhir task — tidak boleh ada baris sisa di database production.
- Order dummy wajib pakai `user_id = null` supaya tidak ada email/notifikasi terkirim ke user asli (baik `applyChallenge` maupun `applyRefund` melewati blok `if (order.user_id)` kalau `user_id` null).

---

## Task 1: Fix Routing #12 + Idempotency #13 & Bonus, dengan Verifikasi End-to-End

**Files:**
- Modify: `app/api/webhooks/midtrans/route.ts` (3 perubahan presisi: baris ~518-521 routing, fungsi `applyRefund` baris ~315-329, fungsi `applyChallenge` baris ~371-386)

**Interfaces:** Tidak ada — perubahan internal ke satu file, tidak ada fungsi baru yang diekspor/dikonsumsi task lain (task tunggal di plan ini).

### Bagian A: Perubahan Kode

- [ ] **Step 1: Perbaiki routing di `POST` handler — arahkan `capture`+`challenge` ke `applyChallenge`**

Old (baris ~515-523):
```ts
    const txStatus = body.transaction_status;
    const fraudStatus = body.fraud_status;

    if (
      (txStatus === "settlement" || txStatus === "capture") &&
      fraudStatus !== "deny"
    ) {
      await applySettlement(body.order_id, body);
    } else if (txStatus === "pending") {
```

New:
```ts
    const txStatus = body.transaction_status;
    const fraudStatus = body.fraud_status;

    if (txStatus === "capture" && fraudStatus === "challenge") {
      await applyChallenge(body.order_id);
    } else if (
      (txStatus === "settlement" || txStatus === "capture") &&
      fraudStatus !== "deny"
    ) {
      await applySettlement(body.order_id, body);
    } else if (txStatus === "pending") {
```

Baris-baris `else if` sesudahnya (`expire`, `cancel`, `deny`, `refund`/`partial_refund`, dan fallback `challenge` literal di baris ~533) **tidak berubah** — cukup satu kondisi baru disisipkan di awal chain.

- [ ] **Step 2: Tambah idempotency guard di `applyRefund`**

Old (baris ~315-324):
```ts
async function applyRefund(orderId: string) {
  const svc = createServiceClient();

  const { data: order } = await svc
    .from("orders")
    .select("id, status, user_id")
    .eq("order_number", orderId)
    .maybeSingle();

  if (!order) return;
```

New:
```ts
async function applyRefund(orderId: string) {
  const svc = createServiceClient();

  const { data: order } = await svc
    .from("orders")
    .select("id, status, user_id")
    .eq("order_number", orderId)
    .maybeSingle();

  if (!order || order.status === "refunded") return;
```

Sisa fungsi `applyRefund` (update orders, insert history, update payments, notifikasi/email, admin notification — baris ~326-368) **tidak berubah**.

- [ ] **Step 3: Tambah idempotency guard di `applyChallenge` berbasis hasil UPDATE**

Old (baris ~371-393):
```ts
async function applyChallenge(orderId: string) {
  const svc = createServiceClient();

  const { data: order } = await svc
    .from("orders")
    .select("id, status, user_id")
    .eq("order_number", orderId)
    .maybeSingle();

  if (!order) return;

  await svc
    .from("payments")
    .update({ status: "challenge" })
    .eq("midtrans_order_id", orderId)
    .eq("status", "pending");

  await svc.from("order_status_history").insert({
    order_id: order.id,
    status: order.status,
    note: "Pembayaran ditandai 'challenge' oleh Midtrans — perlu review manual di Midtrans Dashboard.",
    changed_by: null,
  });

  if (order.user_id) {
```

New:
```ts
async function applyChallenge(orderId: string) {
  const svc = createServiceClient();

  const { data: order } = await svc
    .from("orders")
    .select("id, status, user_id")
    .eq("order_number", orderId)
    .maybeSingle();

  if (!order) return;

  const { data: updatedPayment } = await svc
    .from("payments")
    .update({ status: "challenge" })
    .eq("midtrans_order_id", orderId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (!updatedPayment) return;

  await svc.from("order_status_history").insert({
    order_id: order.id,
    status: order.status,
    note: "Pembayaran ditandai 'challenge' oleh Midtrans — perlu review manual di Midtrans Dashboard.",
    changed_by: null,
  });

  if (order.user_id) {
```

Sisa fungsi (notifikasi user, admin notification — baris ~395-411) **tidak berubah**.

- [ ] **Step 4: Verifikasi type-check & lint**

Run: `npx tsc --noEmit && npx eslint app/api/webhooks/midtrans/route.ts`
Expected: tidak ada error baru (repo ini punya ribuan lint error pre-existing tidak terkait di file lain — abaikan, di luar scope).

### Bagian B: Verifikasi End-to-End dengan Order Dummy

⚠️ Bagian ini menyentuh database production (satu-satunya Supabase project yang ada). Ikuti persis, dan **wajib** jalankan Step 12 (cleanup) di akhir — jangan berhenti sebelum itu meski semua step sebelumnya sukses.

- [ ] **Step 5: Siapkan variabel pengujian**

Jalankan di Bash:

```bash
STATUS_CODE="200"
GROSS_AMOUNT="150000.00"
```

⚠️ **Jangan** menentukan sendiri nilai `order_number` (misal `"TEST-WEBHOOK-..."`) — tabel `orders` punya trigger `set_order_number` (`BEFORE INSERT`, lihat `supabase/migrations/002_functions_triggers.sql`) yang **selalu menimpa** kolom `order_number` dengan format `GT-YYYYMMDD-XXXXXX` hasil generate sendiri, apapun yang di-insert. Nilai `order_number` yang benar baru diketahui **setelah** insert, lewat `RETURNING`. Ini juga didokumentasikan di CLAUDE.md ("Order number format: `GT-YYYYMMDD-XXXXXX` (auto-generated via DB trigger)").

- [ ] **Step 6: Buat order + payment dummy lewat Supabase MCP**

Load tool `mcp__aa92a9b6-90f3-4069-8f53-ced449bcf99a__execute_sql` via ToolSearch kalau belum ter-load. Project ID: `xvgcmqpnrloqbneacdpx`.

Jangan sertakan kolom `order_number` sama sekali di INSERT (biar trigger yang isi), dan ambil nilainya lewat `RETURNING`:

```sql
insert into orders (user_id, recipient_name, recipient_phone, shipping_province, shipping_city, shipping_district, shipping_postal, shipping_address, subtotal, total)
values (null, 'Test Webhook (hapus setelah verifikasi)', '081200000000', 'DKI Jakarta', 'Jakarta Selatan', 'Kebayoran Lama', '12210', 'Data uji webhook - bukan alamat asli', 150000, 150000)
returning id, order_number;
```

Catat **kedua** nilai yang dikembalikan: `id` sebagai `TEST_ORDER_ID`, dan `order_number` (nilai asli hasil trigger, contoh `GT-20260704-A1B2C3`) sebagai `TEST_ORDER` — dipakai persis seperti itu di semua step selanjutnya (payload webhook, signature, query verifikasi, cleanup). Lalu:

```sql
insert into payments (order_id, midtrans_order_id, status, gross_amount)
values ('<TEST_ORDER_ID>', '<TEST_ORDER>', 'pending', 150000)
returning id;
```

- [ ] **Step 7: Hitung signature (sekali saja, dipakai ulang untuk semua skenario)**

Pastikan dev server jalan (`npm run dev`) sebelum lanjut ke step pengiriman request.

Set dulu `TEST_ORDER` di sesi Bash yang sama dengan nilai `order_number` asli yang dikembalikan di Step 6 (bukan digenerate sendiri):

```bash
TEST_ORDER="<order_number hasil RETURNING di Step 6, misal GT-20260704-A1B2C3>"
```

```bash
SERVER_KEY=$(sed -n 's/^MIDTRANS_SERVER_KEY=//p' .env.local | tr -d '"\r')
SIG=$(MIDTRANS_SERVER_KEY="$SERVER_KEY" node -e "
const crypto = require('crypto');
const s = process.argv[1] + process.argv[2] + process.argv[3] + process.env.MIDTRANS_SERVER_KEY;
console.log(crypto.createHash('sha512').update(s).digest('hex'));
" "$TEST_ORDER" "$STATUS_CODE" "$GROSS_AMOUNT")
echo "signature siap dipakai (nilai SERVER_KEY tidak di-print)"
```

Jangan jalankan `echo "$SERVER_KEY"` atau `echo "$SIG"` dengan cara yang menampilkan `$SERVER_KEY` — `$SIG` boleh dipakai di request berikutnya tapi tidak perlu di-print terpisah.

- [ ] **Step 8: Skenario 1 — `capture` + `fraud_status: challenge` (pertama kali)**

```bash
curl -s -X POST http://localhost:3000/api/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d "{\"order_id\":\"$TEST_ORDER\",\"status_code\":\"$STATUS_CODE\",\"gross_amount\":\"$GROSS_AMOUNT\",\"transaction_status\":\"capture\",\"fraud_status\":\"challenge\",\"payment_type\":\"credit_card\",\"transaction_id\":\"test-txn-1\",\"signature_key\":\"$SIG\"}"
```

Expected: response `{"ok":true}`.

Verifikasi lewat `execute_sql` (project `xvgcmqpnrloqbneacdpx`):

```sql
select o.status as order_status, p.status as payment_status,
  (select count(*) from order_status_history where order_id = o.id) as history_count,
  (select count(*) from shipments where order_id = o.id) as shipment_count
from orders o join payments p on p.order_id = o.id
where o.order_number = '<TEST_ORDER>';
```

Expected: `order_status = 'pending_payment'` (tidak berubah), `payment_status = 'challenge'`, `history_count = 1`, `shipment_count = 0` (membuktikan `applySettlement` TIDAK terpanggil — stok/shipment tidak tersentuh).

- [ ] **Step 9: Skenario 2 — kirim ulang payload yang sama persis (simulasi Midtrans resend)**

```bash
curl -s -X POST http://localhost:3000/api/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d "{\"order_id\":\"$TEST_ORDER\",\"status_code\":\"$STATUS_CODE\",\"gross_amount\":\"$GROSS_AMOUNT\",\"transaction_status\":\"capture\",\"fraud_status\":\"challenge\",\"payment_type\":\"credit_card\",\"transaction_id\":\"test-txn-1\",\"signature_key\":\"$SIG\"}"
```

Expected: response `{"ok":true}`.

Jalankan ulang query verifikasi di Step 8. Expected: **`history_count` masih 1** (bukan 2) — membuktikan guard idempotensi `applyChallenge` bekerja.

- [ ] **Step 10: Skenario 3 — `refund` pada order yang sama (belum pernah di-refund)**

```bash
curl -s -X POST http://localhost:3000/api/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d "{\"order_id\":\"$TEST_ORDER\",\"status_code\":\"$STATUS_CODE\",\"gross_amount\":\"$GROSS_AMOUNT\",\"transaction_status\":\"refund\",\"signature_key\":\"$SIG\"}"
```

Expected: response `{"ok":true}`.

Verifikasi:

```sql
select o.status as order_status, p.status as payment_status,
  (select count(*) from order_status_history where order_id = o.id) as history_count
from orders o join payments p on p.order_id = o.id
where o.order_number = '<TEST_ORDER>';
```

Expected: `order_status = 'refunded'`, `payment_status = 'refunded'`, `history_count = 2` (1 dari challenge di Step 8, 1 dari refund ini).

- [ ] **Step 11: Skenario 4 — kirim ulang payload refund yang sama persis**

```bash
curl -s -X POST http://localhost:3000/api/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d "{\"order_id\":\"$TEST_ORDER\",\"status_code\":\"$STATUS_CODE\",\"gross_amount\":\"$GROSS_AMOUNT\",\"transaction_status\":\"refund\",\"signature_key\":\"$SIG\"}"
```

Expected: response `{"ok":true}`.

Jalankan ulang query verifikasi di Step 10. Expected: **`history_count` masih 2** (bukan 3) — membuktikan guard idempotensi `applyRefund` bekerja.

- [ ] **Step 12: Cleanup — hapus semua data dummy (WAJIB, jangan skip)**

```sql
delete from admin_notifications where data->>'orderNumber' = '<TEST_ORDER>';
delete from orders where order_number = '<TEST_ORDER>';
```

(`payments` dan `order_status_history` ikut terhapus otomatis lewat `ON DELETE CASCADE` dari `orders` — dikonfirmasi dari `supabase/migrations/001_schema.sql`. `admin_notifications` tidak punya FK ke `orders`, jadi harus dihapus manual duluan.)

Verifikasi cleanup berhasil total:

```sql
select
  (select count(*) from orders where order_number = '<TEST_ORDER>') as orders_left,
  (select count(*) from payments where midtrans_order_id = '<TEST_ORDER>') as payments_left,
  (select count(*) from admin_notifications where data->>'orderNumber' = '<TEST_ORDER>') as admin_notif_left;
```

Expected: semua kolom `0`.

- [ ] **Step 13: Commit**

```bash
git add app/api/webhooks/midtrans/route.ts
git commit -m "fix: perbaiki routing capture+challenge dan idempotency applyRefund/applyChallenge di webhook Midtrans"
```

---

## Self-Review Notes

- **Spec coverage**: Step 1 ↔ item #12 (routing), Step 2 ↔ item #13 (`applyRefund` idempotency), Step 3 ↔ bonus (`applyChallenge` idempotency) — semua 3 perubahan dari spec [2026-07-04-midtrans-webhook-fixes-design.md](../specs/2026-07-04-midtrans-webhook-fixes-design.md) tercakup. Bagian B (Step 5-12) mengimplementasikan seluruh rencana verifikasi di §6 spec.
- **Placeholder scan**: tidak ada "TBD"/"implement later" — setiap step berisi kode/SQL/command lengkap, termasuk hasil yang diharapkan secara spesifik (angka `history_count`, status enum persis).
- **Type consistency**: perubahan hanya menambah 1 kondisi routing + 2 guard idempotensi, tidak mengubah signature fungsi manapun (`applyRefund(orderId: string)`, `applyChallenge(orderId: string)` tetap sama) — tidak ada risiko drift nama/parameter karena tidak ada task lain yang mengonsumsi perubahan ini.
- **Keamanan data pengujian**: instruksi eksplisit di Global Constraints dan Step 7 untuk tidak pernah print `MIDTRANS_SERVER_KEY` mentah; Step 12 wajib dijalankan sebelum task dianggap selesai, dengan query verifikasi (bukan asumsi) bahwa cleanup benar-benar berhasil.
