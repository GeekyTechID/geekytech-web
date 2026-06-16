# Design: Auto-Generated Promotional Pages & Links

**Date:** 2026-06-16
**Status:** Approved

## Overview

Admin dapat membuat flash sale dan promosi di panel admin, dan sistem secara otomatis menghasilkan halaman publik beserta link-nya — tanpa programmer perlu hardcode URL apapun. Title dan banner di homepage otomatis menjadi clickable dan mengarah ke halaman yang tepat.

Tidak berlaku untuk: main banner dan section-section statis di beranda.

---

## Scope

| Tipe | Halaman Publik | Link Auto |
|---|---|---|
| Flash sale | `/flash-sale/[id]` | Title + banner |
| Promosi (featured_products) | `/promo/[id]` | Title |
| Promosi (second_products) | `/promo/[id]` | Title |
| Main banner | ❌ excluded | — |
| Section beranda statis | ❌ excluded | — |

---

## 1. URL & Link Computation

**File baru:** `lib/promo-links.ts`

```typescript
export const getFlashSaleLink = (id: string) => `/flash-sale/${id}`;
export const getPromoLink = (id: string) => `/promo/${id}`;
```

- ID yang dipakai adalah UUID dari Supabase — di-generate sistem, bukan user input → inherently XSS-safe
- Tidak ada slug yang perlu di-sanitize
- Tidak ada kolom baru di DB
- Semua komponen yang butuh link import dari `lib/promo-links.ts` — tidak ada URL hardcode di komponen

---

## 2. Halaman Publik Baru

Kedua halaman berada di route group `(public)` sehingga mendapat navbar + footer.

### `/app/(public)/flash-sale/[id]/page.tsx`

- Server Component, `revalidate = 60` (ISR)
- Fetch data via `fetchFlashSalePageData(id)`
- Jika `null` → `notFound()`
- Layout (dari atas ke bawah):
  1. Nama flash sale + subtitle
  2. Countdown timer — extract logika dari `home-flash-sale-block.tsx` jadi shared Client Component baru di `components/store/flash-sale-countdown.tsx`, lalu dipakai di sini
  3. Product grid — sama dengan product grid yang dipakai di homepage

### `/app/(public)/promo/[id]/page.tsx`

- Server Component, `revalidate = 60` (ISR)
- Fetch data via `fetchPromotionPageData(id)`
- Jika `null` → `notFound()`
- Layout:
  1. Title + subtitle
  2. Product grid

---

## 3. Data Fetching

**File baru:** `lib/data/promo-pages.ts`

Semua fungsi di-wrap dengan React `cache()` — konsisten dengan pattern di `home-storefront.ts`.
Pakai Supabase **server client biasa** (bukan service role) — data ini public.

### `fetchFlashSalePageData(id: string)`

- Query `flash_sales` by ID: `name`, `subtitle`, `starts_at`, `ends_at`, `is_active`
- Join `flash_sale_products` → `product_variants` → `products`
- Return `null` jika tidak ditemukan

### `fetchPromotionPageData(id: string)`

- Query `promotions` by ID: `type`, `title`, `subtitle`, `is_active`
- Reuse `resolvePromotionShelfProducts(promotion)` yang sudah ada untuk ambil produk
- Return `null` jika tidak ditemukan

---

## 4. Perubahan Homepage

### `components/store/home-flash-sale-block.tsx`

- Title section → wrap dengan `<Link href={getFlashSaleLink(flashSale.id)}>`
- Banner flash sale → link di-compute dari field `template` yang sudah ada (`"flash_sale:{id}"`) → parse ID → `getFlashSaleLink(id)`. Computed saat render, tidak ada DB write.

### `components/store/home-dynamic-promo-blocks.tsx`

- Title tiap promo block → wrap dengan `<Link href={getPromoLink(promo.id)}>`

**Styling link:** tidak ada underline, hover warna `#EA5329`, cursor pointer — ikut design system yang sudah ada.

---

## 5. Edge Cases & Error States

| Kondisi | Handling |
|---|---|
| ID tidak ditemukan di DB | `notFound()` → 404 |
| `is_active = false` | `notFound()` → 404 |
| Flash sale sudah berakhir (`ends_at` lewat) | Halaman tetap render; countdown diganti teks "Flash sale telah berakhir"; produk masih tampil |
| Flash sale belum mulai (`starts_at` belum tiba) | `notFound()` → 404 |
| Promo aktif tapi 0 produk | Empty state: "Belum ada produk" |
| Flash sale semua kuota habis | Produk tetap tampil dengan badge "Habis" |

Tidak ada perubahan di `middleware.ts` — semua route ini public.

---

## 6. File Ringkasan

| Aksi | File |
|---|---|
| Baru | `lib/promo-links.ts` |
| Baru | `lib/data/promo-pages.ts` |
| Baru | `app/(public)/flash-sale/[id]/page.tsx` |
| Baru | `app/(public)/promo/[id]/page.tsx` |
| Modifikasi | `components/store/home-flash-sale-block.tsx` |
| Modifikasi | `components/store/home-dynamic-promo-blocks.tsx` |

---

## Keputusan yang Tidak Diambil

- **Slug dari nama** — tidak dipilih karena UUID sudah cukup unik dan aman, tidak perlu kolom `slug` di DB
- **Single unified `/promo/[id]` route** — tidak dipilih karena flash sale butuh countdown timer dan layout berbeda
- **Query params (`/products?flash_sale_id=xxx`)** — tidak dipilih karena layout tidak bisa dikustomisasi
