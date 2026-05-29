# Invoice & App Fee — Design Spec
Date: 2026-05-28

## Overview

Implementasi invoice yang bisa diunduh (print-to-PDF) di tab invoice halaman detail pesanan dashboard user, sekaligus memperbaiki biaya jasa aplikasi (Rp 1.000) yang sebelumnya hanya tampil di frontend checkout tapi tidak tersimpan ke DB dan tidak dicharge via Midtrans.

---

## Scope

| Area | Perubahan |
|------|-----------|
| DB | Tambah kolom `app_fee` ke tabel `orders` |
| Checkout API | Sertakan `app_fee` di `total`, simpan ke DB, kirim `gross_amount` yang benar ke Midtrans |
| Dashboard order detail | Tambah baris "Biaya jasa aplikasi" di cost breakdown |
| Invoice page | Rebuild penuh: Server Component (auth + access control) + Client Component (invoice HTML + print) |

---

## 1. Database Migration

Tambah kolom ke tabel `orders`:

```sql
ALTER TABLE orders
  ADD COLUMN app_fee integer NOT NULL DEFAULT 0;
```

- Default `0` agar order lama (sebelum migration) tidak terpengaruh
- Tipe `integer`, unit Rupiah (sama dengan kolom lain: `subtotal`, `shipping_cost`, dll.)

---

## 2. Checkout API (`app/api/checkout/create/route.ts`)

Tambah konstanta:
```ts
const APP_SERVICE_FEE = 1000;
```

Update kalkulasi total:
```ts
// Sebelum:
const total = Math.max(0, subtotalRounded - discountAmount + shippingCost);

// Sesudah:
const total = Math.max(0, subtotalRounded - discountAmount + shippingCost + APP_SERVICE_FEE);
```

Update insert `orders`:
```ts
{
  // ... kolom lain
  app_fee: APP_SERVICE_FEE,
  total,
}
```

`gross_amount` Midtrans menggunakan `total` yang sudah termasuk fee — tidak perlu perubahan lain di Midtrans block.

> **Catatan:** Order lama di DB punya `app_fee = 0`. Tampilkan baris "Biaya jasa aplikasi" hanya jika `order.app_fee > 0`.

---

## 3. Dashboard Order Detail (`app/(dashboard)/dashboard/orders/[id]/page.tsx`)

Tambah baris di cost breakdown (setelah ongkir, sebelum total):

```tsx
{order.app_fee > 0 && (
  <li className="flex justify-between gap-4 px-4 py-3">
    <span className="text-sm text-[#7a7a7a]">Biaya jasa aplikasi</span>
    <span className="text-sm font-semibold tabular-nums">{formatRupiah(order.app_fee)}</span>
  </li>
)}
```

---

## 4. Invoice Page — Server Component (`app/(dashboard)/dashboard/orders/[id]/invoice/page.tsx`)

### Alur

```
Auth check → fetchOrderDetailForUser → cek ada payment.status === 'paid'?
  Tidak → render pesan "Invoice belum tersedia"
  Ya    → tentukan watermarkType → render <InvoicePrintView />
```

### Logika Watermark

```ts
type WatermarkType = "LUNAS" | "DIBATALKAN" | "DIKEMBALIKAN" | null;

function resolveWatermark(orderStatus: OrderStatus): WatermarkType {
  if (orderStatus === "cancelled") return "DIBATALKAN";
  if (orderStatus === "refunded") return "DIKEMBALIKAN";
  return "LUNAS"; // paid, processing, shipped, delivered, completed
}
```

Watermark ditentukan dari `order.status`, bukan payment status. Invoice hanya render jika ada paid payment — watermark `null` tidak terjadi dalam kondisi valid.

---

## 5. Invoice Client Component (`components/dashboard/invoice-print-view.tsx`)

### Props

```ts
type InvoicePrintViewProps = {
  order: Database["public"]["Tables"]["orders"]["Row"];
  items: DashboardOrderItemRow[];
  paidPayment: Database["public"]["Tables"]["payments"]["Row"];
  watermark: "LUNAS" | "DIBATALKAN" | "DIKEMBALIKAN";
};
```

### Layout Invoice

```
┌──────────────────────────────────────────────────────┐
│ [LOGO /logo.png]               INVOICE               │
│ GeekyTech                      No: GT-YYYYMMDD-X     │
│ geekytech.id                   Tgl: [paid_at]        │
├──────────────────────────────────────────────────────┤
│ Tagihan kepada:                                      │
│ [recipient_name] · [recipient_phone]                 │
│ [shipping_address], [shipping_district]              │
│ [shipping_city], [shipping_province] [shipping_postal]│
├──────────────────────────────────────────────────────┤
│ Produk          Varian    Qty   Harga      Subtotal   │
│ ──────────────────────────────────────────────────── │
│ [item rows...]                                       │
├──────────────────────────────────────────────────────┤
│                        Subtotal produk:  Rp xxx      │
│                        Diskon:          -Rp xxx  (jika ada) │
│                        Ongkos kirim:     Rp xxx      │
│                        Biaya jasa app:  Rp 1.000 (jika > 0) │
│                        TOTAL:            Rp xxx      │
├──────────────────────────────────────────────────────┤
│ Metode bayar: [payment_type label]                   │
│ Waktu bayar:  [paid_at formatted]                    │
├──────────────────────────────────────────────────────┤
│ Terima kasih telah berbelanja di GeekyTech!          │
│ Pertanyaan? Hubungi kami di geekytech.id             │
└──────────────────────────────────────────────────────┘
           [Watermark diagonal di tengah]
```

### Watermark Styling

```css
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%) rotate(-30deg);
font-size: 72px;
font-weight: 900;
opacity: 0.12;
pointer-events: none;
user-select: none;
z-index: 10;
```

- `"LUNAS"` → warna `#16a34a` (green-600)
- `"DIBATALKAN"` → warna `#dc2626` (red-600)
- `"DIKEMBALIKAN"` → warna `#dc2626` (red-600)

### Print CSS (via `<style>` tag di Client Component)

```css
@media print {
  [data-no-print] { display: none !important; }
  body { background: white !important; }
  @page { margin: 1.5cm; }
}
```

Elemen yang perlu `data-no-print`:
- Tombol "Cetak / Unduh PDF" — di dalam `InvoicePrintView`
- Dashboard sidebar — tambah `data-no-print` ke root element di `components/layout/dashboard-sidebar.tsx`
- Dashboard topbar/navbar — tambah `data-no-print` ke root element di komponen topbar dashboard

### Tombol Print

```tsx
<button
  data-no-print
  onClick={() => window.print()}
  className="..."
>
  Cetak / Unduh PDF
</button>
```

---

## 6. Payment Method Labels

Gunakan `PAYMENT_METHOD_LABELS` map yang sudah ada di `orders/[id]/page.tsx` — pindah ke `lib/constants/payment-method-labels.ts` agar bisa dipakai di invoice tanpa duplikasi.

```ts
// lib/constants/payment-method-labels.ts
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bca_va: "BCA Virtual Account",
  bni_va: "BNI Virtual Account",
  // ...
};
```

---

## 7. File Changes Summary

| File | Action |
|------|--------|
| `supabase/migrations/YYYYMMDD_add_app_fee_to_orders.sql` | CREATE — DB migration |
| `app/api/checkout/create/route.ts` | MODIFY — add APP_SERVICE_FEE, update total calc + order insert |
| `lib/constants/payment-method-labels.ts` | CREATE — extract PAYMENT_METHOD_LABELS dari order detail page |
| `app/(dashboard)/dashboard/orders/[id]/page.tsx` | MODIFY — tambah baris app_fee di cost breakdown + import dari constants |
| `app/(dashboard)/dashboard/orders/[id]/invoice/page.tsx` | MODIFY — rebuild sebagai orchestrator Server Component |
| `components/dashboard/invoice-print-view.tsx` | CREATE — invoice HTML + print button + watermark |
| `components/layout/dashboard-sidebar.tsx` | MODIFY — tambah `data-no-print` ke root element |
| `components/layout/dashboard-topbar.tsx` (atau equiv) | MODIFY — tambah `data-no-print` ke root element |

---

## 8. Edge Cases

| Kasus | Handling |
|-------|----------|
| Order lama (`app_fee = 0`) | Sembunyikan baris biaya jasa aplikasi |
| Belum ada paid payment | Tampil pesan "Invoice belum tersedia", tidak render invoice |
| `paidPayment.paid_at` null | Tampil tanggal order dibuat sebagai fallback |
| Item tanpa `variant_name` | Tampilkan "—" di kolom Varian |
| Diskon 0 | Sembunyikan baris Diskon |
| Nama produk panjang | Truncate dengan CSS di print, tidak wrap tabel |

---

## Out of Scope

- PDF generation server-side (bukan `window.print()`)
- Email invoice otomatis
- Admin invoice view
- NPWP / faktur pajak formal
