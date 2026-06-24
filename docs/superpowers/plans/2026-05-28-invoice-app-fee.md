# Invoice & App Fee Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah kolom `app_fee` ke orders (benar-benar dicharge via Midtrans), tampilkan di dashboard order detail, dan rebuild invoice page dengan branded print-to-PDF + watermark.

**Architecture:** DB migration menambah `app_fee integer default 0` ke tabel `orders`. Checkout API menyertakan Rp 1.000 fee di total sebelum kirim ke Midtrans. Invoice adalah Server Component yang cek paid payment lalu render `InvoicePrintView` (Client Component) dengan `window.print()` dan CSS `@media print`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase, Tailwind CSS, shadcn/ui

---

## File Map

| File | Action | Tanggung jawab |
|------|--------|----------------|
| `supabase/migrations/017_add_app_fee_to_orders.sql` | CREATE | Tambah kolom `app_fee` ke tabel `orders` |
| `types/supabase.ts` | MODIFY | Tambah `app_fee: number` ke Row/Insert/Update orders |
| `lib/constants/payment-method-labels.ts` | CREATE | Extract `PAYMENT_METHOD_LABELS` agar bisa dipakai di invoice |
| `app/api/checkout/create/route.ts` | MODIFY | Tambah `APP_SERVICE_FEE`, update total + order insert |
| `app/(dashboard)/dashboard/orders/[id]/page.tsx` | MODIFY | Tambah baris app_fee di cost breakdown, import labels dari constants |
| `components/dashboard/dashboard-shell.tsx` | MODIFY | Tambah `data-no-print` ke sidebar, mobile header, StoreHeader wrapper |
| `app/(dashboard)/layout.tsx` | MODIFY | Tambah `data-no-print` ke `WhatsAppButton` wrapper |
| `components/dashboard/invoice-print-view.tsx` | CREATE | Invoice HTML + print button + watermark + print CSS |
| `app/(dashboard)/dashboard/orders/[id]/invoice/page.tsx` | MODIFY | Rebuild: auth, access control, watermark logic, render InvoicePrintView |

---

## Task 1: DB Migration — Tambah kolom `app_fee`

**Files:**
- Create: `supabase/migrations/017_add_app_fee_to_orders.sql`
- Modify: `types/supabase.ts` (orders Row/Insert/Update)

- [ ] **Step 1: Buat file migration**

```sql
-- supabase/migrations/017_add_app_fee_to_orders.sql
-- ============================================================
-- 017_add_app_fee_to_orders.sql
-- Tambah kolom app_fee ke tabel orders.
-- Order lama mendapat default 0 (fee belum diimplementasi).
-- ============================================================

ALTER TABLE orders
  ADD COLUMN app_fee integer NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Jalankan migration di Supabase**

Buka Supabase Dashboard → SQL Editor → paste isi file di atas → Run.

Verifikasi:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'app_fee';
```
Expected: 1 row, `data_type = integer`, `column_default = 0`.

- [ ] **Step 3: Update TypeScript types — `types/supabase.ts`**

Cari baris di dalam `orders > Row:` (sekitar baris 724) dan tambahkan field `app_fee`:

```typescript
// Tambah di dalam orders > Row: (setelah baris pertama, urutan alfabet sebelum "coupon_code")
app_fee: number
```

Cari baris di dalam `orders > Insert:` dan tambahkan:
```typescript
app_fee?: number
```

Cari baris di dalam `orders > Update:` dan tambahkan:
```typescript
app_fee?: number
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/017_add_app_fee_to_orders.sql types/supabase.ts
git commit -m "feat: add app_fee column to orders table"
```

---

## Task 2: Extract PAYMENT_METHOD_LABELS ke constants

**Files:**
- Create: `lib/constants/payment-method-labels.ts`
- Modify: `app/(dashboard)/dashboard/orders/[id]/page.tsx`

- [ ] **Step 1: Buat file constants**

```typescript
// lib/constants/payment-method-labels.ts
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bca_va: "BCA Virtual Account",
  bni_va: "BNI Virtual Account",
  bri_va: "BRI Virtual Account",
  permata_va: "Permata Virtual Account",
  echannel: "Mandiri Bill Payment",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  qris: "QRIS",
  indomaret: "Indomaret",
  alfamart: "Alfamart",
  credit_card: "Kartu Kredit",
};
```

- [ ] **Step 2: Update order detail page — ganti inline map dengan import**

Di `app/(dashboard)/dashboard/orders/[id]/page.tsx`, tambahkan import di bagian atas file (setelah import lain):

```typescript
import { PAYMENT_METHOD_LABELS } from "@/lib/constants/payment-method-labels";
```

Hapus definisi inline `PAYMENT_METHOD_LABELS` (baris 40–52 di file):

```typescript
// HAPUS blok ini:
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bca_va: "BCA Virtual Account",
  bni_va: "BNI Virtual Account",
  bri_va: "BRI Virtual Account",
  permata_va: "Permata Virtual Account",
  echannel: "Mandiri Bill Payment",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  qris: "QRIS",
  indomaret: "Indomaret",
  alfamart: "Alfamart",
  credit_card: "Kartu Kredit",
};
```

- [ ] **Step 3: Verifikasi compile**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/constants/payment-method-labels.ts app/(dashboard)/dashboard/orders/[id]/page.tsx
git commit -m "refactor: extract PAYMENT_METHOD_LABELS to shared constants"
```

---

## Task 3: Update Checkout API — sertakan app_fee di total

**Files:**
- Modify: `app/api/checkout/create/route.ts`

- [ ] **Step 1: Tambah konstanta dan update total**

Buka `app/api/checkout/create/route.ts`. Cari baris (sekitar 221–222):

```typescript
const shippingCost = ship.price;
const total = Math.max(0, subtotalRounded - discountAmount + shippingCost);
```

Ganti dengan:

```typescript
const APP_SERVICE_FEE = 1000;
const shippingCost = ship.price;
const total = Math.max(0, subtotalRounded - discountAmount + shippingCost + APP_SERVICE_FEE);
```

- [ ] **Step 2: Simpan app_fee saat insert order**

Cari blok `svc.from("orders").insert({...})` (sekitar baris 229–250). Tambahkan field `app_fee` di dalam object insert, setelah `discount_amount`:

```typescript
discount_amount: discountAmount,
app_fee: APP_SERVICE_FEE,
total,
```

- [ ] **Step 3: Verifikasi compile**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/checkout/create/route.ts
git commit -m "feat: include app_fee (Rp 1000) in order total and save to DB"
```

---

## Task 4: Tampilkan app_fee di Dashboard Order Detail

**Files:**
- Modify: `app/(dashboard)/dashboard/orders/[id]/page.tsx`

- [ ] **Step 1: Tambah baris app_fee di cost breakdown**

Di `app/(dashboard)/dashboard/orders/[id]/page.tsx`, cari baris ongkir di cost breakdown (sekitar baris 215–220):

```tsx
<li className="flex justify-between gap-4 px-4 py-3">
  <span className="text-sm text-[#7a7a7a]">Ongkir</span>
  <span className="text-sm font-semibold tabular-nums">{formatRupiah(order.shipping_cost)}</span>
</li>
```

Tambahkan baris baru **setelah** baris ongkir tersebut, sebelum baris Total:

```tsx
{order.app_fee > 0 && (
  <li className="flex justify-between gap-4 px-4 py-3">
    <span className="text-sm text-[#7a7a7a]">Biaya jasa aplikasi</span>
    <span className="text-sm font-semibold tabular-nums">{formatRupiah(order.app_fee)}</span>
  </li>
)}
```

- [ ] **Step 2: Verifikasi compile**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/dashboard/orders/[id]/page.tsx"
git commit -m "feat: show app_fee in dashboard order detail cost breakdown"
```

---

## Task 5: Tambah data-no-print ke DashboardShell dan Layout

**Files:**
- Modify: `components/dashboard/dashboard-shell.tsx`
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Update DashboardShell — tambah data-no-print**

Di `components/dashboard/dashboard-shell.tsx`, tambahkan `data-no-print` ke 4 elemen:

**1. Wrapper StoreHeader** — cari baris:
```tsx
<StoreHeader categories={categories} initialCartCount={initialCartCount} />
```
Bungkus dengan div:
```tsx
<div data-no-print>
  <StoreHeader categories={categories} initialCartCount={initialCartCount} />
</div>
```

**2. Desktop sidebar div** — cari:
```tsx
<div className="hidden w-[min(100%,18rem)] shrink-0 lg:flex lg:self-start lg:sticky lg:top-28 xl:w-[min(100%,19rem)]">
```
Tambahkan `data-no-print`:
```tsx
<div data-no-print className="hidden w-[min(100%,18rem)] shrink-0 lg:flex lg:self-start lg:sticky lg:top-28 xl:w-[min(100%,19rem)]">
```

**3. Mobile drawer wrapper** — cari baris `{mobileOpen ? (` yang membungkus seluruh mobile drawer block, lalu tambahkan wrapper `<div data-no-print>` di luarnya. Isi dalam tidak berubah. Hasilnya:
```tsx
<div data-no-print>
  {mobileOpen ? (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
        aria-label="Tutup menu"
        onClick={() => setMobileOpen(false)}
      />
      <div
        className="fixed inset-y-0 left-0 z-50 flex w-[min(92vw,20rem)] max-w-[20rem] flex-col border-r border-[#e8e4dc] bg-gradient-to-b from-[#faf8f4] to-[#f5f0eb] shadow-2xl lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Menu akun"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#e8e4dc] px-3 py-2.5 pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
          <span className="text-[11px] font-bold uppercase text-[#7a7a7a]">Menu akun</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Tutup menu"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <DashboardSidebar
            className="h-full min-h-0"
            unreadNotifications={unreadNotifications}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      </div>
    </>
  ) : null}
</div>
```

**4. Mobile sticky header** — cari:
```tsx
<header className="sticky top-0 z-30 flex w-full shrink-0 items-center gap-3 bg-white/95 px-3 py-2.5 backdrop-blur-sm supports-[backdrop-filter]:bg-white/90 sm:px-4 sm:py-3 lg:hidden">
```
Tambahkan `data-no-print`:
```tsx
<header data-no-print className="sticky top-0 z-30 flex w-full shrink-0 items-center gap-3 bg-white/95 px-3 py-2.5 backdrop-blur-sm supports-[backdrop-filter]:bg-white/90 sm:px-4 sm:py-3 lg:hidden">
```

- [ ] **Step 2: Update layout — tambah data-no-print ke WhatsAppButton dan hero/footer**

Di `app/(dashboard)/layout.tsx`, cari:
```tsx
<WhatsAppButton />
<div className="mt-10 md:mt-16">
  {heroBanners.length > 0 ? <HomeMainHero banners={heroBanners} hideNav /> : null}
</div>

<Suspense fallback={<div className="min-h-[120px] w-full bg-[#121212]" aria-hidden />}>
  <StoreFooter />
</Suspense>
```

Ganti dengan:
```tsx
<div data-no-print>
  <WhatsAppButton />
</div>
<div data-no-print className="mt-10 md:mt-16">
  {heroBanners.length > 0 ? <HomeMainHero banners={heroBanners} hideNav /> : null}
</div>

<div data-no-print>
  <Suspense fallback={<div className="min-h-[120px] w-full bg-[#121212]" aria-hidden />}>
    <StoreFooter />
  </Suspense>
</div>
```

- [ ] **Step 3: Verifikasi compile**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/dashboard-shell.tsx "app/(dashboard)/layout.tsx"
git commit -m "feat: add data-no-print to dashboard shell for invoice printing"
```

---

## Task 6: Buat InvoicePrintView Component

**Files:**
- Create: `components/dashboard/invoice-print-view.tsx`

- [ ] **Step 1: Buat file component**

```typescript
// components/dashboard/invoice-print-view.tsx
"use client";

import Image from "next/image";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants/payment-method-labels";
import { formatRupiah, formatDate } from "@/lib/format";
import type { Database } from "@/types/supabase";
import type { DashboardOrderItemRow } from "@/lib/data/dashboard-user";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Payment = Database["public"]["Tables"]["payments"]["Row"];

type WatermarkType = "LUNAS" | "DIBATALKAN" | "DIKEMBALIKAN";

type InvoicePrintViewProps = {
  order: Order;
  items: DashboardOrderItemRow[];
  paidPayment: Payment;
  watermark: WatermarkType;
};

const WATERMARK_COLOR: Record<WatermarkType, string> = {
  LUNAS: "#16a34a",
  DIBATALKAN: "#dc2626",
  DIKEMBALIKAN: "#dc2626",
};

export function InvoicePrintView({ order, items, paidPayment, watermark }: InvoicePrintViewProps) {
  const invoiceDate = paidPayment.paid_at ?? order.created_at;
  const paymentLabel =
    paidPayment.payment_type
      ? (PAYMENT_METHOD_LABELS[paidPayment.payment_type] ?? paidPayment.payment_type)
      : "—";

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          [data-no-print] { display: none !important; }
          body { background: white !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      {/* Tombol print — tersembunyi saat print */}
      <div data-no-print className="mb-6 flex justify-end">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-[#1d1d1f] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-80"
        >
          Cetak / Unduh PDF
        </button>
      </div>

      {/* Invoice container */}
      <div
        id="invoice-print-area"
        className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-[#e0e0e0] bg-white p-8 text-[#1d1d1f] print:max-w-none print:rounded-none print:border-none print:p-0 print:shadow-none"
      >
        {/* Watermark */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-30deg)",
            fontSize: "80px",
            fontWeight: 900,
            opacity: 0.1,
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 10,
            color: WATERMARK_COLOR[watermark],
            whiteSpace: "nowrap",
            letterSpacing: "0.05em",
          }}
        >
          {watermark}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="relative h-8 w-36">
              <Image
                src="/logo.png"
                alt="GeekyTech"
                fill
                className="object-contain object-left"
                sizes="144px"
              />
            </div>
            <p className="mt-2 text-xs text-[#5c5c5c]">GeekyTech</p>
            <p className="text-xs text-[#5c5c5c]">geekytech.id</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black uppercase tracking-wide text-[#1d1d1f]">Invoice</p>
            <p className="mt-1 font-mono text-sm font-bold text-[#1d1d1f]">{order.order_number}</p>
            <p className="mt-0.5 text-xs text-[#7a7a7a]">
              {formatDate(invoiceDate, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Tagihan kepada */}
        <div className="mt-8 rounded-lg bg-[#fafafa] p-4">
          <p className="text-[11px] font-bold uppercase text-[#7a7a7a]">Tagihan kepada</p>
          <p className="mt-1.5 font-semibold text-[#1d1d1f]">{order.recipient_name}</p>
          <p className="text-sm text-[#5c5c5c]">{order.recipient_phone}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#5c5c5c]">
            {order.shipping_address}, {order.shipping_district},{" "}
            {order.shipping_city}, {order.shipping_province} {order.shipping_postal}
          </p>
        </div>

        {/* Items table */}
        <div className="mt-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0]">
                <th className="pb-2 text-left text-[11px] font-bold uppercase text-[#7a7a7a]">Produk</th>
                <th className="pb-2 text-left text-[11px] font-bold uppercase text-[#7a7a7a]">Varian</th>
                <th className="pb-2 text-right text-[11px] font-bold uppercase text-[#7a7a7a]">Qty</th>
                <th className="pb-2 text-right text-[11px] font-bold uppercase text-[#7a7a7a]">Harga</th>
                <th className="pb-2 text-right text-[11px] font-bold uppercase text-[#7a7a7a]">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="max-w-[160px] truncate py-3 pr-3 font-medium text-[#1d1d1f]">
                    {item.product_name}
                  </td>
                  <td className="py-3 pr-3 text-[#5c5c5c]">{item.variant_name ?? "—"}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{formatRupiah(item.price)}</td>
                  <td className="py-3 text-right font-semibold tabular-nums">{formatRupiah(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cost breakdown */}
        <div className="mt-4 border-t border-[#e0e0e0] pt-4">
          <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-[#7a7a7a]">Subtotal produk</span>
              <span className="tabular-nums">{formatRupiah(order.subtotal)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-[#7a7a7a]">Diskon</span>
                <span className="tabular-nums text-[#EA5329]">−{formatRupiah(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-[#7a7a7a]">Ongkos kirim</span>
              <span className="tabular-nums">{formatRupiah(order.shipping_cost)}</span>
            </div>
            {order.app_fee > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-[#7a7a7a]">Biaya jasa aplikasi</span>
                <span className="tabular-nums">{formatRupiah(order.app_fee)}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-[#e0e0e0] pt-2 font-bold">
              <span className="text-[#1d1d1f]">Total</span>
              <span className="tabular-nums text-[#1d1d1f]">{formatRupiah(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment info */}
        <div className="mt-8 rounded-lg bg-[#fafafa] p-4 text-sm">
          <p className="text-[11px] font-bold uppercase text-[#7a7a7a]">Informasi Pembayaran</p>
          <div className="mt-2 space-y-1">
            <div className="flex gap-2">
              <span className="w-28 shrink-0 text-[#7a7a7a]">Metode bayar</span>
              <span className="font-medium text-[#1d1d1f]">{paymentLabel}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 shrink-0 text-[#7a7a7a]">Waktu bayar</span>
              <span className="text-[#1d1d1f]">
                {formatDate(invoiceDate, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-[#e0e0e0] pt-6 text-center">
          <p className="text-sm font-semibold text-[#1d1d1f]">
            Terima kasih telah berbelanja di GeekyTech!
          </p>
          <p className="mt-1 text-xs text-[#7a7a7a]">
            Pertanyaan? Hubungi kami di geekytech.id
          </p>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verifikasi compile**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/invoice-print-view.tsx
git commit -m "feat: add InvoicePrintView component with print-to-PDF and watermark"
```

---

## Task 7: Rebuild Invoice Page (Server Component)

**Files:**
- Modify: `app/(dashboard)/dashboard/orders/[id]/invoice/page.tsx`

- [ ] **Step 1: Ganti seluruh isi file**

```typescript
// app/(dashboard)/dashboard/orders/[id]/invoice/page.tsx
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { InvoicePrintView } from "@/components/dashboard/invoice-print-view";
import type { Database } from "@/types/supabase";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type WatermarkType = "LUNAS" | "DIBATALKAN" | "DIKEMBALIKAN";

function resolveWatermark(status: OrderStatus): WatermarkType {
  if (status === "cancelled") return "DIBATALKAN";
  if (status === "refunded") return "DIKEMBALIKAN";
  return "LUNAS";
}

export default async function OrderInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/orders/${id}/invoice`);

  const detail = await fetchOrderDetailForUser(user.id, id);
  if (!detail) notFound();

  const { order, items, payments } = detail;
  const paidPayment = payments.find((p) => p.status === "paid");

  if (!paidPayment) {
    return (
      <div className="rounded-xl border border-[#e0e0e0] bg-white p-8 text-center">
        <p className="text-base font-semibold text-[#1d1d1f]">Invoice belum tersedia</p>
        <p className="mt-2 text-sm text-[#7a7a7a]">
          Invoice hanya tersedia setelah pembayaran dikonfirmasi.
        </p>
      </div>
    );
  }

  const watermark = resolveWatermark(order.status);

  return (
    <InvoicePrintView
      order={order}
      items={items}
      paidPayment={paidPayment}
      watermark={watermark}
    />
  );
}
```

- [ ] **Step 2: Verifikasi compile**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/dashboard/orders/[id]/invoice/page.tsx"
git commit -m "feat: rebuild invoice page with branded print-to-PDF and watermark"
```

---

## Task 8: Manual Testing Checklist

Jalankan dev server:
```bash
npm run dev
```

- [ ] **Test 1: Order belum bayar**
  - Buka `/dashboard/orders/[id]/invoice` untuk order dengan status `pending_payment`
  - Expected: tampil pesan "Invoice belum tersedia"

- [ ] **Test 2: Invoice order lunas**
  - Buka tab Invoice untuk order dengan payment `paid`
  - Expected: invoice tampil lengkap dengan watermark "LUNAS" (hijau, diagonal, semi-transparan)
  - Cek semua field: logo, order number, tanggal, tagihan kepada, item rows, subtotal/diskon/ongkir/app_fee/total, metode bayar, waktu bayar

- [ ] **Test 3: Print / Unduh PDF**
  - Klik tombol "Cetak / Unduh PDF"
  - Expected: browser print dialog terbuka
  - Di print preview: sidebar, navbar, tombol, footer, WhatsApp button tidak tampil — hanya invoice
  - Save as PDF → cek hasilnya

- [ ] **Test 4: Order dibatalkan setelah bayar**
  - Buka invoice untuk order `cancelled` yang punya paid payment
  - Expected: invoice tampil dengan watermark "DIBATALKAN" (merah)

- [ ] **Test 5: Order direfund**
  - Buka invoice untuk order `refunded`
  - Expected: watermark "DIKEMBALIKAN" (merah)

- [ ] **Test 6: Order lama (app_fee = 0)**
  - Buka order detail lama (sebelum migration) — pastikan baris "Biaya jasa aplikasi" **tidak tampil**
  - Buka invoice order lama — pastikan baris app_fee **tidak tampil** di cost breakdown

- [ ] **Test 7: Checkout baru — fee benar**
  - Lakukan checkout baru sampai selesai
  - Cek di Supabase: `SELECT app_fee, total FROM orders ORDER BY created_at DESC LIMIT 1`
  - Expected: `app_fee = 1000`, `total = subtotal - discount + shipping + 1000`
  - Cek di dashboard order detail: baris "Biaya jasa aplikasi Rp 1.000" tampil

- [ ] **Step 8: Final commit jika ada perbaikan kecil**

```bash
git add -p
git commit -m "fix: invoice adjustments from testing"
```
