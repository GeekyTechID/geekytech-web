# Flash Sale Cart Pricing — Design Spec

**Date:** 2026-06-07  
**Scope:** Cart + Checkout UI — flash sale price display & split discount summary

---

## Goal

Produk yang sedang dalam flash sale aktif harus:
1. Menggunakan harga flash sale (bukan harga normal) di cart & checkout — sudah diimplementasi di data layer, tidak perlu diubah.
2. Menampilkan badge "⚡ Flash Sale" di kartu cart untuk membedakan dari diskon biasa.
3. Memisahkan nominal diskon di ringkasan pesanan menjadi dua baris: "Diskon produk" (diskon reguler) dan "Diskon flash sale".

---

## Changes

### 1. `CartLineView` type (`components/store/cart-line-card.tsx`)

Tambah field:
```ts
isFlashSale: boolean;
```

### 2. Data layer (`lib/data/user-cart-lines.ts`)

Kedua fungsi (`fetchUserCartWithLines`, `fetchVariantAsBuyNowLine`) sudah menghitung `flashSalePrice`. Tambah `isFlashSale` ke setiap line yang di-push:

```ts
isFlashSale: flashSalePrice != null &&
  (productSalePrice == null || flashSalePrice <= productSalePrice) &&
  flashSalePrice < listPrice,
```

Kondisi: flash sale price yang digunakan DAN harganya lebih kecil dari list price (ada diskon nyata).

### 3. Cart line card (`components/store/cart-line-card.tsx`)

Tambah chip di bawah `variantName` (baris `<p className="mt-1 text-sm ...">`) ketika `line.isFlashSale`:

```tsx
{line.isFlashSale && (
  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#EA5329]/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#EA5329]">
    ⚡ Flash Sale
  </span>
)}
```

### 4. Cart summary (`components/store/cart-client-shell.tsx`)

Pisah `discountTotal` menjadi dua computed values:

```ts
const flashSaleDiscount = useMemo(
  () => selectedLines
    .filter((l) => l.isFlashSale)
    .reduce((s, l) => s + (l.listPrice - l.unitPrice) * l.qty, 0),
  [selectedLines],
);
const regularDiscount = useMemo(
  () => Math.max(0, discountTotal - flashSaleDiscount),
  [discountTotal, flashSaleDiscount],
);
```

Tampilkan dua baris (masing-masing hanya jika `> 0`):
- "Diskon produk" → `regularDiscount`
- "Diskon flash sale" → `flashSaleDiscount`

Jika salah satu nol, baris tersebut disembunyikan.

### 5. Checkout summary (`components/checkout/checkout-page-client.tsx`)

Sama dengan cart summary: pisah `catalogDiscount` menjadi `flashSaleDiscount` + `regularDiscount`, tampilkan dua baris terpisah.

---

## Files Changed

| File | Perubahan |
|------|-----------|
| `components/store/cart-line-card.tsx` | Tambah `isFlashSale` ke type + badge chip |
| `lib/data/user-cart-lines.ts` | Set `isFlashSale` di kedua fungsi |
| `components/store/cart-client-shell.tsx` | Pisah discount menjadi 2 baris |
| `components/checkout/checkout-page-client.tsx` | Pisah discount menjadi 2 baris |

---

## Out of Scope

- Perubahan DB / API
- Granular split per-item antara regular sale vs flash sale (overlap case — sangat jarang)
- Perubahan di halaman product detail
