# Flash Sale Cart Pricing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tampilkan badge "Flash Sale" di kartu cart dan pisahkan diskon flash sale dari diskon produk biasa di ringkasan pesanan (cart + checkout).

**Architecture:** `isFlashSale: boolean` ditambah ke `CartLineView` type, di-set di data layer saat flash sale price yang menang, lalu dibaca UI untuk badge + split 2 baris ringkasan.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Supabase

---

## File Map

| File | Perubahan |
|------|-----------|
| `components/store/cart-line-card.tsx` | Tambah `isFlashSale: boolean` ke type `CartLineView` + badge chip |
| `lib/data/user-cart-lines.ts` | Set `isFlashSale` di `fetchUserCartWithLines` + `fetchVariantAsBuyNowLine` |
| `components/store/cart-client-shell.tsx` | Pisah `discountTotal` → `flashSaleDiscount` + `regularDiscount`, 2 baris UI |
| `components/checkout/checkout-page-client.tsx` | Sama: pisah `catalogDiscount` → 2 baris di ringkasan |

---

## Task 1: Tambah `isFlashSale` ke `CartLineView` type

**Files:**
- Modify: `components/store/cart-line-card.tsx` (type definition, baris 18–40)

- [ ] **Step 1: Tambah field ke type**

Di `components/store/cart-line-card.tsx`, temukan type `CartLineView` dan tambah `isFlashSale: boolean;` setelah `discountPercent`:

```typescript
export type CartLineView = {
  lineId: string;
  qty: number;
  maxQty: number;
  variantId: string;
  variantName: string;
  productId: string;
  productName: string;
  slug: string;
  categoryId: string | null;
  categoryLabel: string;
  brandId: string | null;
  descriptionExcerpt: string;
  rating: number;
  reviewCount: number;
  soldCount: number;
  listPrice: number;
  unitPrice: number;
  discountPercent: number | null;
  isFlashSale: boolean;
  images: { url: string; alt: string | null }[];
  sku: string;
  weightGrams: number;
};
```

- [ ] **Step 2: Pastikan TypeScript tidak error**

```bash
cd /Users/rendytomaluweng/Documents/GeekyTechWebsite && npx tsc --noEmit 2>&1 | head -30
```

Expected: error tentang `isFlashSale` missing di `user-cart-lines.ts` (akan diperbaiki di Task 2). Error lain berarti ada yang tidak beres.

---

## Task 2: Set `isFlashSale` di data layer

**Files:**
- Modify: `lib/data/user-cart-lines.ts` (fungsi `fetchUserCartWithLines` ~baris 157 dan `fetchVariantAsBuyNowLine` ~baris 253)

- [ ] **Step 1: Set `isFlashSale` di `fetchUserCartWithLines`**

Temukan blok push ke `lines` (sekitar baris 157–179). Tambah komputasi `isFlashSale` sebelum `lines.push(...)` dan sertakan di object:

```typescript
// Setelah baris: const { listPrice, unitPrice, discountPercent } = computeVariantUnitPrice(...)
const isFlashSale =
  flashSalePrice != null &&
  (productSalePrice == null || flashSalePrice < productSalePrice) &&
  unitPrice < listPrice;

lines.push({
  lineId: r.id,
  qty: r.quantity,
  maxQty,
  variantId: v.id,
  variantName: v.name,
  productId: p.id,
  productName: p.name,
  slug: p.slug,
  categoryId: p.category_id ?? null,
  categoryLabel: cat?.name ?? "Produk",
  brandId: p.brand_id ?? null,
  descriptionExcerpt: excerpt(p.description),
  rating: Number(p.average_rating ?? 0),
  reviewCount: p.review_count ?? 0,
  soldCount: p.total_sold ?? 0,
  listPrice,
  unitPrice,
  discountPercent,
  isFlashSale,
  images: sortImages(p.product_images),
  sku: v.sku,
  weightGrams: Math.max(1, Math.round(Number(v.weight) || 1)),
});
```

- [ ] **Step 2: Set `isFlashSale` di `fetchVariantAsBuyNowLine`**

Temukan `return {` di akhir fungsi `fetchVariantAsBuyNowLine` (~baris 252). Tambah komputasi dan field yang sama:

```typescript
// Setelah baris: const { listPrice, unitPrice, discountPercent } = computeVariantUnitPrice(...)
const isFlashSale =
  flashSalePrice != null &&
  (productSalePrice == null || flashSalePrice < productSalePrice) &&
  unitPrice < listPrice;

return {
  lineId: "buy-now",
  qty: Math.min(Math.max(1, qty), maxQty),
  maxQty,
  variantId: row.id,
  variantName: row.name,
  productId: prod.id,
  productName: prod.name,
  slug: prod.slug,
  categoryId: prod.category_id ?? null,
  categoryLabel: cat?.name ?? "Produk",
  brandId: prod.brand_id ?? null,
  descriptionExcerpt: excerpt(prod.description),
  rating: Number(prod.average_rating ?? 0),
  reviewCount: prod.review_count ?? 0,
  soldCount: prod.total_sold ?? 0,
  listPrice,
  unitPrice,
  discountPercent,
  isFlashSale,
  images: sortImages(prod.product_images),
  sku: row.sku,
  weightGrams: Math.max(1, Math.round(Number(row.weight) || 1)),
};
```

- [ ] **Step 3: Verifikasi TypeScript bersih**

```bash
cd /Users/rendytomaluweng/Documents/GeekyTechWebsite && npx tsc --noEmit 2>&1 | head -30
```

Expected: **no errors** (atau hanya error tidak terkait task ini).

- [ ] **Step 4: Commit**

```bash
git add components/store/cart-line-card.tsx lib/data/user-cart-lines.ts
git commit -m "feat(cart): add isFlashSale flag to CartLineView type and data layer"
```

---

## Task 3: Badge "Flash Sale" di cart-line-card

**Files:**
- Modify: `components/store/cart-line-card.tsx` (render, sekitar baris 143–144)

- [ ] **Step 1: Tambah badge setelah variantName**

Di `cart-line-card.tsx`, temukan baris:
```tsx
<p className="mt-1 text-sm font-medium text-[#5c5c5c]">{line.variantName}</p>
```

Ubah menjadi:
```tsx
<p className="mt-1 text-sm font-medium text-[#5c5c5c]">{line.variantName}</p>
{line.isFlashSale && (
  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#EA5329]/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#EA5329]">
    ⚡ Flash Sale
  </span>
)}
```

- [ ] **Step 2: Verifikasi TypeScript bersih**

```bash
cd /Users/rendytomaluweng/Documents/GeekyTechWebsite && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/store/cart-line-card.tsx
git commit -m "feat(cart): add Flash Sale badge chip to cart line card"
```

---

## Task 4: Pisah diskon di ringkasan cart

**Files:**
- Modify: `components/store/cart-client-shell.tsx` (computed values ~baris 36, UI ~baris 95–99)

- [ ] **Step 1: Ganti `discountTotal` dengan dua computed values**

Temukan baris:
```typescript
const discountTotal = useMemo(() => Math.max(0, subtotalGross - subtotal), [subtotalGross, subtotal]);
```

Ganti dengan:
```typescript
const flashSaleDiscount = useMemo(
  () =>
    selectedLines
      .filter((l) => l.isFlashSale)
      .reduce((s, l) => s + Math.max(0, l.listPrice - l.unitPrice) * l.qty, 0),
  [selectedLines],
);
const regularDiscount = useMemo(
  () => Math.max(0, subtotalGross - subtotal) - flashSaleDiscount,
  [subtotalGross, subtotal, flashSaleDiscount],
);
```

- [ ] **Step 2: Ganti baris "Diskon produk" di UI dengan dua baris kondisional**

Temukan blok JSX:
```tsx
<div className="flex justify-between gap-4">
  <dt className="text-white/75">Diskon produk</dt>
  <dd className={cn("shrink-0 font-semibold tabular-nums", discountTotal > 0 && "text-[#EA5329]")}>
    {discountTotal > 0 ? `−${formatRupiah(discountTotal)}` : formatRupiah(0)}
  </dd>
</div>
```

Ganti dengan:
```tsx
{regularDiscount > 0 && (
  <div className="flex justify-between gap-4">
    <dt className="text-white/75">Diskon produk</dt>
    <dd className="shrink-0 font-semibold tabular-nums text-[#EA5329]">
      −{formatRupiah(regularDiscount)}
    </dd>
  </div>
)}
{flashSaleDiscount > 0 && (
  <div className="flex justify-between gap-4">
    <dt className="text-white/75">Diskon flash sale</dt>
    <dd className="shrink-0 font-semibold tabular-nums text-[#EA5329]">
      −{formatRupiah(flashSaleDiscount)}
    </dd>
  </div>
)}
```

- [ ] **Step 3: Verifikasi TypeScript bersih**

```bash
cd /Users/rendytomaluweng/Documents/GeekyTechWebsite && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/store/cart-client-shell.tsx
git commit -m "feat(cart): split discount summary into regular and flash sale rows"
```

---

## Task 5: Pisah diskon di ringkasan checkout

**Files:**
- Modify: `components/checkout/checkout-page-client.tsx` (computed ~baris 223, UI ~baris 659–663)

- [ ] **Step 1: Ganti `catalogDiscount` dengan dua computed values**

Temukan baris:
```typescript
const catalogDiscount = Math.max(0, Math.round(subtotalGross - subtotalNet));
```

Ganti dengan:
```typescript
const flashSaleDiscount = lines
  .filter((l) => l.isFlashSale)
  .reduce((s, l) => s + Math.max(0, l.listPrice - l.unitPrice) * l.qty, 0);
const regularDiscount = Math.max(0, Math.round(subtotalGross - subtotalNet) - flashSaleDiscount);
```

- [ ] **Step 2: Ganti baris "Diskon katalog" di UI dengan dua baris kondisional**

Temukan blok JSX:
```tsx
<div className="flex justify-between gap-4">
  <dt className="text-white/75">Diskon katalog</dt>
  <dd className={cn("shrink-0 font-semibold tabular-nums", catalogDiscount > 0 && "text-[#ffb4a1]")}>
    {catalogDiscount > 0 ? `−${formatRupiah(catalogDiscount)}` : formatRupiah(0)}
  </dd>
</div>
```

Ganti dengan:
```tsx
{regularDiscount > 0 && (
  <div className="flex justify-between gap-4">
    <dt className="text-white/75">Diskon produk</dt>
    <dd className="shrink-0 font-semibold tabular-nums text-[#ffb4a1]">
      −{formatRupiah(regularDiscount)}
    </dd>
  </div>
)}
{flashSaleDiscount > 0 && (
  <div className="flex justify-between gap-4">
    <dt className="text-white/75">Diskon flash sale</dt>
    <dd className="shrink-0 font-semibold tabular-nums text-[#ffb4a1]">
      −{formatRupiah(flashSaleDiscount)}
    </dd>
  </div>
)}
```

- [ ] **Step 3: Verifikasi TypeScript bersih**

```bash
cd /Users/rendytomaluweng/Documents/GeekyTechWebsite && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/checkout/checkout-page-client.tsx
git commit -m "feat(checkout): split discount summary into regular and flash sale rows"
```

---

## Self-Review Checklist

- [x] `isFlashSale` ditambah ke type (Task 1) sebelum digunakan di data layer (Task 2) dan UI (Task 3–5)
- [x] Field name konsisten: `isFlashSale` di semua 4 file
- [x] Badge hanya muncul jika `isFlashSale === true`
- [x] Baris ringkasan hanya muncul jika nilainya `> 0`
- [x] Tidak ada perubahan DB/API (sesuai scope)
- [x] `grandTotal` di checkout tidak berubah: masih `subtotalNet - couponDiscount + shippingFee + serviceFee`
