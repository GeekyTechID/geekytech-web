# Complaint & Return System — Design Spec

**Date:** 2026-06-24
**Status:** Approved

---

## Overview

Upgrade sistem komplain + tambah alur retur penggantian produk. Entry point tetap komplain — admin review dulu sebelum retur disetujui. Hanya satu tipe resolusi: penggantian produk (bukan refund).

User hanya bisa ajukan komplain dalam **3 hari sejak order berstatus `delivered`**. Setelah 3 hari, order otomatis pindah ke `completed` (via cron/DB trigger) dan halaman komplain tidak bisa diakses — user hanya bisa beri review produk. Informasi batas waktu ini ditampilkan di halaman tracking pengiriman user.

---

## Data Model

### Perubahan `complaints` (existing table)

Tambah kolom:
- `category` (text, not null) — enum values: `wrong_item`, `damaged`, `missing_item`, `not_as_described`, `other`

Kolom `images` (JSON) sudah ada — hanya perlu UX upload di form user.

Status tambahan untuk komplain yang masuk jalur retur:
- Existing: `open`, `in_review`, `resolved`, `rejected`
- Tambah: `return_approved` (admin setujui retur, menunggu user kirim balik)

### Tabel baru: `complaint_messages`

```sql
id          uuid primary key default gen_random_uuid()
complaint_id uuid not null references complaints(id) on delete cascade
sender_id   uuid not null references profiles(id)
message     text not null
created_at  timestamptz not null default now()
```

Inline thread antara admin dan user. Tidak real-time — revalidate on submit.

### Tabel baru: `returns`

```sql
id           uuid primary key default gen_random_uuid()
complaint_id uuid not null references complaints(id)
order_id     uuid not null references orders(id)
user_id      uuid not null references profiles(id)
status       text not null default 'pending_shipback'
             -- pending_shipback | shipped_back | received | replacement_sent | completed
return_awb   text null           -- diisi user setelah kirim balik
return_courier text null         -- nama kurir yang user pakai
admin_note   text null
created_at   timestamptz not null default now()
updated_at   timestamptz not null default now()
```

### Tabel baru: `return_shipments`

```sql
id                uuid primary key default gen_random_uuid()
return_id         uuid not null references returns(id)
biteship_order_id text null
awb_number        text null
courier           text null
status            text null
created_at        timestamptz not null default now()
```

Menyimpan data Biteship untuk pengiriman penggantian dari GeekyTech ke user.

---

## Alur User

### 1. Ajukan Komplain — `/dashboard/orders/[id]/complaint`

Form diupgrade dari versi sekarang:
- **Dropdown kategori** (required): wrong_item / damaged / missing_item / not_as_described / other
- **Ringkasan** (text input, required) — existing
- **Detail** (textarea, optional) — existing
- **Upload media bukti** (max 5 file: gambar JPG/PNG atau video MP4/MOV, masing-masing max 50 MB) — upload ke Supabase Storage bucket `complaint-images`, simpan URL di `complaints.images`

### 2. Tunggu Review

Setelah submit, user lihat status di halaman detail order. Ada inline thread — user bisa balas pesan admin.

### 3. Admin Setujui Retur → Section "Kirim Barang Kembali"

Status komplain → `return_approved`. Di halaman `/dashboard/orders/[id]/complaint` muncul section baru:

> **Kirim Barang Kembali**
> Alamat tujuan: [dari `settings` table — alamat GeekyTech + no. HP CS]
> Form: nama kurir + nomor resi
> Tombol "Konfirmasi Sudah Kirim"

Submit → isi `returns.return_awb` + `return_courier`, status returns → `shipped_back`.

### 4. Tunggu Konfirmasi Admin

User lihat pesan: *"Barang sedang diperiksa oleh tim GeekyTech."*

### 5. Penggantian Dikirim — `/dashboard/orders/[id]/return`

Status → `replacement_sent`. User dapat notifikasi + bisa lihat AWB + lacak resi penggantian di halaman terpisah `/dashboard/orders/[id]/return`.

---

## Alur Admin

### Halaman `/admin/complaints/[id]` — diupgrade

**Tambahan di halaman:**

1. **Inline thread** — admin kirim pesan, user balas. Tampil chronological.
2. **Section "Tindakan Retur"** (muncul saat `in_review`):
   - Tombol "Setujui Retur" → buat record `returns` (status `pending_shipback`), komplain → `return_approved`
   - Tombol Tolak tetap ada
3. **Section "Status Retur"** (muncul jika returns record ada):
   - Tampil AWB + kurir yang diinput user (saat `shipped_back`)
   - Tombol "Konfirmasi Terima Barang" (saat `shipped_back`) → status → `received`
4. **Form "Kirim Penggantian"** (muncul saat `received`):
   - Pre-fill item dari order asli (admin bisa adjust qty dan uncheck item yang tidak perlu diganti — tidak bisa tambah item baru)
   - Pre-fill alamat tujuan dari order asli (bisa diedit)
   - Pilih kurir
   - Tombol "Buat Shipment Biteship" → buat `return_shipments` + Biteship order → status → `replacement_sent`

### Halaman `/admin/returns` — baru

Tabel semua return request, filter by status. Entry terpisah dari complaints list di sidebar admin.

---

## Komponen & File Baru / Diubah

### User side

| File | Aksi |
|------|------|
| `components/dashboard/order-complaint-form.tsx` | Upgrade: tambah dropdown kategori + image/video upload |
| `app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx` | Tambah inline thread + section kirim balik (conditional by status) |
| `app/(dashboard)/dashboard/orders/[id]/return/page.tsx` | Baru: status retur + tracking penggantian |
| `app/(dashboard)/dashboard/orders/_actions.ts` | Tambah action: submitReturnAWB |

### Admin side

| File | Aksi |
|------|------|
| `app/admin/(panel)/complaints/[id]/_components/complaint-detail.tsx` | Tambah inline thread + approve/return flow |
| `app/admin/(panel)/complaints/_actions.ts` | Tambah: approveReturn, confirmReceived, createReplacementShipment |
| `app/admin/(panel)/returns/page.tsx` | Baru: tabel returns |
| `app/admin/(panel)/returns/[id]/page.tsx` | Baru: detail return (redirect ke complaint detail) |
| `app/admin/(panel)/returns/_actions.ts` | Baru |

### Shared

| Item | Detail |
|------|--------|
| Supabase Storage | Bucket `complaint-images`, public read, auth write — mendukung gambar (JPG/PNG) dan video (MP4/MOV) |
| Media upload helper | `lib/supabase/upload-complaint-media.ts` |
| Notifikasi user | Saat `return_approved`, `replacement_sent` — via `createNotification` |

---

## DB Migrations

1. `ALTER TABLE complaints ADD COLUMN category text NOT NULL DEFAULT 'other'`
2. `CREATE TABLE complaint_messages (...)`
3. `CREATE TABLE returns (...)`
4. `CREATE TABLE return_shipments (...)`
5. RLS untuk semua tabel baru:
   - `complaint_messages`: user bisa read/insert di komplain miliknya; admin service role full access
   - `returns`: user bisa read miliknya, insert via server action only; admin service role full access
   - `return_shipments`: user read only (via return miliknya); admin service role full access

---

## Batas Waktu Komplain

- Order `delivered` → cron job atau Supabase scheduled function cek setiap hari
- Jika `delivered_at` + 3 hari < now → update status order ke `completed`
- Halaman `/dashboard/orders/[id]/complaint` cek status order: jika `completed`, tampilkan pesan "Batas waktu komplain telah berakhir" dan form tidak bisa diakses
- Halaman `/dashboard/orders/[id]/tracking` tampilkan banner: *"Anda memiliki X hari untuk mengajukan komplain jika ada masalah dengan pesanan"* (hitung mundur dari `delivered_at + 3 hari`)
- Gate juga ada di server action `submitComplaintAction` — validasi status order sebelum insert

---

## Out of Scope

- Real-time chat (WebSocket/Supabase Realtime) — cukup revalidate on submit untuk MVP
- Retur tipe refund — sudah ada via alur cancel order
- User ajukan retur langsung tanpa complaint — selalu lewat complaint dulu
- Return shipping label (admin tidak cetak label) — user pilih kurir sendiri, biaya ditanggung user
- Replacement tidak membuat record baru di tabel `orders` — dilacak via `return_shipments` saja
- Status order asli tidak berubah saat retur diproses (tetap `delivered` atau status terakhir)
