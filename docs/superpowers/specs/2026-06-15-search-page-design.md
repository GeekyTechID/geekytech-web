# Search Page Design
**Date:** 2026-06-15  
**Status:** Approved

## Overview

Build `/search?q=...` — the full search results page for GeekyTech. The navbar already routes to this URL. The page does not exist yet.

## Architecture

- **Route:** `app/(public)/search/page.tsx` — Server Component, `force-dynamic`
- **Data layer:** `lib/data/search-page.ts` — new file with all fetch functions
- **UI:** Reuse `HomeProductTile`, `CategoryBrandShelfGroup` types, and existing grid patterns. No new design system components needed.

## URL & Inputs

```
/search?q=<query>
```

- `q` empty or `< 2 chars` → `redirect("/products")`
- Query is trimmed and lowercased before use

## Data Fetch (parallel)

Three queries run in `Promise.all`:

1. **Products by name** — `ilike("name", %q%)` on `products` table, `is_active = true`, `deleted_at IS NULL`. Fetch all matches (cap 200), include brand/category/image/variant data (same select as `CATEGORY_PRODUCT_SELECT`).
2. **Categories by name** — `ilike("name", %q%)` on `categories`, `is_active = true`. Return id/name/slug.
3. **Brands by name** — `ilike("name", %q%)` on `brands`. Return id/name/slug/logo_url.

If any category matches → fetch `fetchCategoryProductsGroupedByBrand(categoryId)` for each matched category (parallel). This reuses the existing function from `lib/data/category-store-page.ts`.

If any brand matches → fetch that brand's products using the same select as products-by-name, filtered by `brand_id`.

## Deduplication

Collect all `productId`s already appearing in category and brand sections. The "loose products" section only shows products whose IDs are NOT in that set and whose names match the query.

## Page Layout (top to bottom)

### Header
```
Hasil pencarian untuk "headphone"
X produk ditemukan
```

### Section: Kategori (if ≥1 category matches)
For each matched category, in order:
```
[Category Name]              ← h2 section heading
[grid: product cards]        ← standard grid, products grouped by brand within
                               with brand name as a sub-heading above each brand group
```

### Section: Brand (if ≥1 brand matches and brand has products)
For each matched brand:
```
[Brand Name] [logo if exists]   ← h2 section heading
[grid: product cards]           ← standard grid, all brand products
```

### Section: Produk (loose matches)
Products whose names match the query but were not shown in category or brand sections above.
```
Produk                          ← h2 heading (omit if this is the only section)
[grid: product cards]
```

### Empty State
If all three sections are empty:
```
Tidak ada hasil untuk "xyz"
[button → Lihat Semua Produk]
```

## Grid Layout

Standard responsive grid — same as product listing pages:
- Mobile: 2 columns
- Tablet: 3 columns  
- Desktop: 4 columns

Brand sub-headings within category section: small label above each brand's product group, separated by a divider or spacing.

## What Is NOT In Scope

- Pagination (50 products total, fits on one page)
- Sort/filter controls
- Autocomplete dropdown (already handled by `/api/search`)
- Typo correction / fuzzy search
- Search analytics

## Files to Create / Modify

| File | Action |
|------|--------|
| `app/(public)/search/page.tsx` | Create — page component |
| `lib/data/search-page.ts` | Create — fetch functions |
| `components/store/search-results-client.tsx` | Create — client wrapper (for any client interactivity if needed, likely not needed) |

The page can be fully server-rendered with no client components required.
