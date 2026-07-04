# Design Spec: Refund Bank Account untuk Pembatalan Pesanan VA

**Tanggal:** 2026-06-28
**Status:** Draft

---

## 1. Latar Belakang

Ketika user membatalkan pesanan yang sudah dibayar via Virtual Account (bank transfer), refund tidak bisa dilakukan otomatis oleh Midtrans API. Admin harus masuk ke Midtrans Dashboard dan input nomor rekening tujuan refund secara manual.

Saat ini sistem tidak mengumpulkan info rekening bank user, sehingga admin tidak tahu harus transfer ke mana.

---

## 2. Solusi

1. Saat user membatalkan pesanan `paid` dengan payment type VA → tampilkan form rekening bank di dalam dialog konfirmasi cancel.
2. Simpan info rekening ke `profiles` user untuk reuse di masa depan.
3. Snapshot rekening ke tabel `orders` agar admin punya referensi per-order yang tidak berubah.
4. Admin melihat info rekening di halaman detail pesanan → proses refund manual di Midtrans Dashboard.

Untuk e-wallet (GoPay, ShopeePay, QRIS, DANA) → refund otomatis via API, tidak perlu form rekening.

---

## 3. Scope

**In scope:**
- Form rekening bank di cancel dialog (hanya untuk paid + VA payment)
- Simpan ke `profiles` (persisted, reusable)
- Tampilkan di admin order detail
- Update profile page dengan section rekening bank

**Out of scope:**
- Integrasi Midtrans Iris (disbursement API) — terlalu kompleks untuk sekarang
- Validasi nomor rekening ke bank API
- Notifikasi ke user saat admin selesai proses refund (bisa ditambah nanti)

---

## 4. Database Migration

### 4a. Tabel `profiles` — tambah 3 kolom

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bank_name        text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text;
```

### 4b. Tabel `orders` — snapshot rekening refund

```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refund_bank_name         text,
  ADD COLUMN IF NOT EXISTS refund_account_name      text,
  ADD COLUMN IF NOT EXISTS refund_account_number    text;
```

Snapshot diperlukan agar info rekening di admin tidak berubah jika user update profil setelah cancel.

---

## 5. Logika Cancel

### Kapan form rekening muncul

```
cancelOrderAction dipanggil
  ├── status === "pending_payment" → cancel biasa, no form
  ├── status === "paid" + payment_type e-wallet → cancel + auto-refund Midtrans, no form
  └── status === "paid" + payment_type bank_transfer/VA → tampilkan form rekening
```

Deteksi VA: `payment_type` mengandung `"bank_transfer"` atau diakhiri `"_va"` (setelah migrasi: `"bca_va"`, `"bni_va"`, dll.)

### `cancelOrderAction` — perubahan

Tambah parameter opsional:
```typescript
cancelOrderAction(
  orderId: string,
  bankInfo?: {
    bank_name: string;
    bank_account_name: string;
    bank_account_number: string;
  }
)
```

Jika `bankInfo` diberikan:
1. Simpan ke `orders` (snapshot: `refund_bank_name`, `refund_account_name`, `refund_account_number`)
2. Simpan ke `profiles` user (upsert — overwrite jika sudah ada)

---

## 6. Perubahan UI

### 6a. Cancel dialog — `components/dashboard/cancel-order-dialog.tsx` (baru)

Dialog dua-step untuk paid VA orders:
- **Step 1:** Konfirmasi pembatalan ("Yakin ingin membatalkan pesanan ini?")
- **Step 2:** Form rekening bank (jika VA + paid)
  - Dropdown `Nama Bank` — pilihan bank populer (BCA, BNI, BRI, Mandiri, BSI, CIMB, SeaBank, Danamon, Permata, dll.) + "Lainnya"
  - Input `Nama Pemilik Rekening`
  - Input `Nomor Rekening`
  - Pre-fill dari `profiles` jika sudah ada
  - Checkbox "Simpan rekening ini ke profil saya" → default ON jika belum ada di profil, hidden jika sudah ada (selalu simpan/update)
  - Info: *"Dana akan dikembalikan dalam 3–14 hari kerja setelah diproses admin."*

Untuk non-VA paid atau pending_payment: dialog satu-step biasa (tanpa form rekening).

### 6b. `components/dashboard/order-toolbar.tsx`

Ubah tombol "Batalkan Pesanan" untuk fetch payment_type order terlebih dahulu sebelum memutuskan dialog yang ditampilkan.

Alternatif lebih sederhana: pass `paymentType` sebagai prop dari parent page.

### 6c. `app/(dashboard)/dashboard/orders/[id]/page.tsx`

Pass `payment.payment_type` ke toolbar/cancel component.

### 6d. Profile page — `components/dashboard/profile-form.tsx`

Tambah section baru "Rekening Bank" di bawah data pribadi:
- Sama dengan form di cancel dialog
- Save via `updateProfileAction` yang sudah ada (extend schema)
- Label: *"Digunakan untuk pengembalian dana jika pesanan dibatalkan setelah pembayaran."*

---

## 7. Admin Order Detail

Di `app/admin/(panel)/orders/[id]/page.tsx`, dalam section "Pengiriman" atau card baru "Info Refund":

Tampilkan jika order `cancelled` dan ada data rekening:
```
Rekening Refund
  Bank         : BCA
  Atas Nama    : Rendy Pratama
  No. Rekening : 1234567890
```

Dengan catatan: *"Proses refund melalui Midtrans Dashboard → Transactions → [nomor order] → Refund."*

---

## 8. File yang Diubah/Dibuat

| File | Aksi |
|---|---|
| `supabase/migrations/XXX_refund_bank.sql` | Baru — ALTER TABLE |
| `types/supabase.ts` | Regenerate (via Supabase CLI) |
| `components/dashboard/cancel-order-dialog.tsx` | Baru |
| `components/dashboard/order-toolbar.tsx` | Ubah — pass paymentType, gunakan dialog baru |
| `app/(dashboard)/dashboard/orders/[id]/page.tsx` | Ubah — pass paymentType ke toolbar |
| `app/(dashboard)/dashboard/orders/_actions.ts` | Ubah — `cancelOrderAction` terima bankInfo |
| `app/(dashboard)/dashboard/profile/_actions.ts` | Ubah — tambah bank fields ke schema |
| `components/dashboard/profile-form.tsx` | Ubah — tambah section rekening bank |
| `app/admin/(panel)/orders/[id]/page.tsx` | Ubah — tampilkan info rekening refund |
