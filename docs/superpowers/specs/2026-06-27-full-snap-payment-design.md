# Design Spec: Migrasi ke Full Snap Midtrans

**Tanggal:** 2026-06-27  
**Status:** Approved  

---

## 1. Latar Belakang & Motivasi

Saat ini, halaman checkout menampilkan custom payment picker (11 metode) yang dibangun di sisi frontend. Metode yang dipilih user kemudian dikirim ke API, dan Snap token dibuat dengan `enabled_payments: [metode_pilihan]` agar modal Snap hanya menampilkan satu metode itu.

**Masalah:**
- Hanya GoPay dan QRIS yang aktif; menampilkan 11 opsi membingungkan dan menurunkan kepercayaan user.
- Setiap kali metode baru diaktivasi, butuh code change + deployment.
- Custom picker harus dijaga sinkron dengan status aktivasi di Midtrans dashboard.

**Solusi:** Hapus custom picker. Biarkan Snap menampilkan semua metode yang sudah aktif di Midtrans dashboard. Payment method configuration sepenuhnya dikontrol dari Midtrans, bukan dari kode.

---

## 2. Metode Pembayaran yang Sedang Diaktivasi

Sedang proses aktivasi (production only, tidak ada di sandbox):
- SeaBank VA, Danamon VA, CIMB VA, BSI VA, BCA VA, BRI VA
- DANA, GoPay ✅, ShopeePay, Akulaku PayLater
- QRIS ✅

Dengan full Snap, semua metode yang sudah aktif langsung muncul tanpa deploy ulang.

---

## 3. Flow Sebelum vs Sesudah

### Sebelum
```
Checkout Page → pilih payment method (custom UI) → klik Beli
→ POST /api/checkout/create (with paymentMethod)
→ Snap token dibuat dengan enabled_payments: [paymentMethod]
→ Snap modal terbuka, hanya 1 metode
→ User bayar → webhook / verify-payment
```

### Sesudah
```
Checkout Page → klik Beli (tanpa pilih payment method dulu)
→ POST /api/checkout/create (tanpa paymentMethod)
→ Snap token dibuat tanpa enabled_payments restriction
→ Snap modal terbuka, semua metode aktif tampil
→ User pilih & bayar di dalam Snap → webhook / verify-payment
```

---

## 4. Perubahan File

### 4.1 `app/api/checkout/create/route.ts`

**Hapus:**
- `paymentMethods` const array
- `paymentMethod: z.enum(paymentMethods)` dari `bodySchema`
- `...(process.env.MIDTRANS_IS_PRODUCTION === "true" ? { enabled_payments: [...] } : {})` block
- Kondisi `paymentMethod === "gopay" || paymentMethod === "shopeepay"` untuk gopay callback

**Ubah:**
- `payment_type: parsed.data.paymentMethod` → `payment_type: "snap"` pada insert ke tabel `payments`
  (nilai ini adalah placeholder; webhook akan overwrite dengan tipe aktual saat user bayar)
- `gopay.callback_url` — sertakan selalu (unconditionally) ketika `appUrl` tersedia, karena kita tidak tahu apakah user akan memilih GoPay

**Tidak berubah:**
- Semua logika order creation
- Stock reservation
- Coupon validation
- Notification creation
- Snap `createTransaction` (hanya hapus `enabled_payments`)

### 4.2 `components/checkout/checkout-page-client.tsx`

**Hapus:**
- Import `MIDTRANS_CHECKOUT_PAYMENT_OPTIONS` dan `MidtransCheckoutPaymentId`
- State `paymentMethod` dan `paymentOpen`
- Memo `selectedPaymentOption`
- Konstanta `PAYMENT_LOGOS` dan komponen `PaymentLogo`
- Seluruh `<Collapsible>` blok "Metode pembayaran" (mulai dari baris ~794 sampai akhir Collapsible)
- Field `paymentMethod` dari body `fetch("/api/checkout/create", ...)`

**Pertahankan:**
- Semua Snap callback: `onSuccess`, `onPending`, `onError`, `onClose` — tidak ada yang berubah
- `loadSnapScript` function — tidak berubah
- `deleteUnpaidOrderAction` pada `onClose` — penting untuk release stock saat user menutup Snap tanpa bayar

**Tambah:**
- Tombol "Beli Sekarang" dipindah dari dalam Collapsible ke posisi standalone di bawah ringkasan pesanan. Style tetap sama.
- Teks info kecil di bawah tombol: *"Pilih metode pembayaran di langkah berikutnya"* untuk set expectation user.

### 4.3 `app/api/webhooks/midtrans/route.ts`

**Ubah `applyPending`:** Tambahkan `payment_type` ke update query.

```typescript
// Sebelum: applyPending tidak menyimpan payment_type
// Sesudah:
await svc.from("payments").update({
  midtrans_transaction_id: notification.transaction_id ?? null,
  ...(notification.payment_type ? { payment_type: notification.payment_type } : {}), // TAMBAH
  va_number: vaNumber,
  payment_code: notification.payment_code ?? null,
  expiry_time: midtransExpiryToISO(notification.expiry_time),
  raw_response: notification as unknown as Json,
}).eq("midtrans_order_id", orderId).eq("status", "pending");
```

**Kenapa penting:** Ketika user pilih BCA VA di Snap, Midtrans langsung kirim webhook `pending` dengan `payment_type: "bank_transfer"` dan `va_number`. Tanpa ini, halaman dashboard user tidak bisa tampilkan "Bayar ke BCA VA: 1234567890" selama menunggu pembayaran.

**Tidak berubah:**
- `verifySignature` — KRITIS, tidak disentuh
- `applySettlement` — semua logika stock, Biteship, notifikasi tidak berubah
- `applyCancelOrExpire` — tidak berubah
- Semua status handling (settlement, capture, pending, expire, cancel, deny)

### 4.4 `lib/constants/midtrans-checkout-payments.ts`

**Hapus file ini** — tidak ada dependensi lain setelah checkout-page-client diupdate.

---

## 5. Security Checklist — Yang Tidak Boleh Berubah

| Mekanisme | File | Status |
|---|---|---|
| Webhook signature verification (SHA512) | `webhooks/midtrans/route.ts` | ✅ Tidak disentuh |
| Order hanya bisa diakses pemilik (`eq("user_id", user.id)`) | `verify-payment/route.ts` | ✅ Tidak disentuh |
| Stock idempotency (check status sebelum update) | `webhooks/midtrans/route.ts` | ✅ Tidak disentuh |
| Payment idempotency (`.neq("status", "paid")`) | `webhooks/midtrans/route.ts` | ✅ Tidak disentuh |
| RLS Supabase | Database | ✅ Tidak disentuh |
| Service role key hanya di server | `checkout/create/route.ts` | ✅ Tidak disentuh |
| Zod validation pada request body | `checkout/create/route.ts` | ✅ Tetap ada (minus paymentMethod field) |
| `onClose` → `deleteUnpaidOrderAction` (release stok jika Snap ditutup) | `checkout-page-client.tsx` | ✅ Tidak disentuh |

---

## 6. Dampak pada Dashboard Admin & User

**Tidak ada perubahan pada tampilan dashboard.** Data yang ditampilkan (payment_type, va_number, status) tetap bersumber dari tabel `payments` yang diisi oleh webhook — sama seperti sebelumnya.

Dengan tambahan update `payment_type` di `applyPending`, dashboard justru jadi **lebih informatif**: user bisa langsung lihat metode apa yang dipilih dan nomor VA/kode pembayarannya saat status masih `pending`.

---

## 7. Konfigurasi Midtrans Dashboard (Non-Code)

Yang perlu disetel di Midtrans dashboard untuk production:
- Aktifkan metode pembayaran sesuai progres aktivasi
- Set warna tema Snap (bisa custom hex) — cocokkan dengan `#EA5329` GeekyTech
- Set logo toko di Snap
- Konfigurasi urutan tampilan metode (VA bank paling atas untuk transaksi nilai besar)

---

## 8. Tidak Dalam Scope

- Perubahan pada halaman order detail, tracking, atau invoice
- Perubahan pada Biteship webhook
- Perubahan schema database
- Penambahan atau perubahan email template
