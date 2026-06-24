# Search Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/search?q=...` — a sectioned search results page that groups results by category and brand.

**Architecture:** Server Component (`force-dynamic`), two new files only. Data layer in `lib/data/search-page.ts` runs three parallel Supabase queries (products/categories/brands by name), then fetches grouped results for matches, deduplicates, and returns a typed result. Page renders sections in order: matching categories → matching brands → loose product name matches.

**Tech Stack:** Next.js 15 App Router, Supabase (service client), TypeScript, Tailwind CSS, existing `BrandStoreProductGrid` + `HomeProductTile` components.

---

## Files

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/data/search-page.ts` | **Create** | All data fetching + deduplication logic |
| `app/(public)/search/page.tsx` | **Create** | Server Component, renders 3 sections + empty state |

No other files need to change. The navbar already routes to `/search?q=...`.

---

## Task 1: Data layer — `lib/data/search-page.ts`

**Files:**
- Create: `lib/data/search-page.ts`

- [ ] **Step 1: Create the file with types and fetch function**

```typescript
import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import {
  productRowToShelf,
  type HomeShelfProduct,
  type ProductQueryRow,
} from "@/lib/data/home-storefront";
import {
  fetchCategoryProductsGroupedByBrand,
  type CategoryBrandShelfGroup,
} from "@/lib/data/category-store-page";

const SEARCH_SELECT = `id, brand_id, name, slug, created_at, average_rating, review_count, total_sold, base_price, sale_price, condition,
  brands:brand_id(id, name, slug, logo_url),
  categories:category_id(name),
  product_images(url, is_primary, sort_order, alt_text),
  product_variants(id, price, name, is_active)`;

export type SearchResultCategory = {
  id: string;
  name: string;
  slug: string;
  groups: CategoryBrandShelfGroup[];
};

export type SearchResultBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  products: HomeShelfProduct[];
};

export type SearchPageResult = {
  query: string;
  categories: SearchResultCategory[];
  brands: SearchResultBrand[];
  looseProducts: HomeShelfProduct[];
  totalCount: number;
};

export async function fetchSearchResults(rawQuery: string): Promise<SearchPageResult> {
  const q = rawQuery.trim();
  const pattern = `%${q}%`;
  const supabase = createServiceClient();

  // 1. Three parallel queries: products by name, categories by name, brands by name
  const [productsRes, categoriesRes, brandsRes] = await Promise.all([
    supabase
      .from("products")
      .select(SEARCH_SELECT)
      .eq("is_active", true)
      .is("deleted_at", null)
      .ilike("name", pattern)
      .order("total_sold", { ascending: false })
      .limit(200),
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .ilike("name", pattern),
    supabase
      .from("brands")
      .select("id, name, slug, logo_url")
      .ilike("name", pattern),
  ]);

  const matchedCategories = (categoriesRes.data ?? []) as {
    id: string; name: string; slug: string;
  }[];
  const matchedBrands = (brandsRes.data ?? []) as {
    id: string; name: string; slug: string; logo_url: string | null;
  }[];

  // 2. Fetch grouped products for each matched category + brand products in parallel
  const [categoryGroupsList, brandProductsList] = await Promise.all([
    Promise.all(
      matchedCategories.map((cat) =>
        fetchCategoryProductsGroupedByBrand(cat.id).then((groups) => ({ cat, groups }))
      )
    ),
    Promise.all(
      matchedBrands.map((brand) =>
        supabase
          .from("products")
          .select(SEARCH_SELECT)
          .eq("brand_id", brand.id)
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("total_sold", { ascending: false })
          .limit(50)
          .then(({ data }) => ({ brand, rows: data ?? [] }))
      )
    ),
  ]);

  // 3. Build categories section
  const categories: SearchResultCategory[] = categoryGroupsList
    .filter(({ groups }) => groups.length > 0)
    .map(({ cat, groups }) => ({ ...cat, groups }));

  // 4. Track all shown product IDs to avoid duplicates
  const shownIds = new Set<string>();
  for (const cat of categories) {
    for (const g of cat.groups) {
      for (const p of g.products) shownIds.add(p.productId);
    }
  }

  // 5. Build brands section (skip products already shown in categories)
  const brands: SearchResultBrand[] = brandProductsList
    .map(({ brand, rows }) => {
      const products: HomeShelfProduct[] = [];
      for (const raw of rows as unknown as ProductQueryRow[]) {
        if (shownIds.has(raw.id)) continue;
        const shelf = productRowToShelf(raw);
        if (shelf) {
          products.push(shelf);
          shownIds.add(raw.id);
        }
      }
      return {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        logoUrl: brand.logo_url,
        products,
      };
    })
    .filter((b) => b.products.length > 0);

  // 6. Loose products: name matches not already in categories or brands
  const looseProducts: HomeShelfProduct[] = [];
  for (const raw of (productsRes.data ?? []) as unknown as ProductQueryRow[]) {
    if (shownIds.has(raw.id)) continue;
    const shelf = productRowToShelf(raw);
    if (shelf) {
      looseProducts.push(shelf);
      shownIds.add(raw.id);
    }
  }

  return { query: q, categories, brands, looseProducts, totalCount: shownIds.size };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: no errors referencing `lib/data/search-page.ts`

---

## Task 2: Page component — `app/(public)/search/page.tsx`

**Files:**
- Create: `app/(public)/search/page.tsx`

- [ ] **Step 1: Create the directory**

```
mkdir app/(public)/search
```

- [ ] **Step 2: Create the page**

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { fetchSearchResults } from "@/lib/data/search-page";
import { BrandStoreProductGrid } from "@/components/store/brand-store-product-grid";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).q?.trim() ?? "";
  return {
    title: q ? `"${q}" — Pencarian GeekyTech` : "Pencarian — GeekyTech",
    description: q ? `Hasil pencarian untuk "${q}" di GeekyTech.` : "Cari produk di GeekyTech.",
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = (await searchParams).q?.trim() ?? "";
  if (q.length < 2) redirect("/products");

  const result = await fetchSearchResults(q);
  const isEmpty =
    result.categories.length === 0 &&
    result.brands.length === 0 &&
    result.looseProducts.length === 0;

  // Only show "Produk / Lainnya" heading if there are other sections too
  const hasMultipleSections =
    [result.categories.length > 0, result.brands.length > 0, result.looseProducts.length > 0]
      .filter(Boolean).length > 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* Page header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#7a7a7a]">
          Pencarian
        </p>
        <h1 className="mt-1 text-[28px] font-semibold uppercase leading-tight text-foreground sm:text-[34px]">
          &ldquo;{result.query}&rdquo;
        </h1>
        <p className="mt-1 text-[15px] text-[#7a7a7a]">
          {isEmpty
            ? "Tidak ada produk ditemukan"
            : `${result.totalCount} produk ditemukan`}
        </p>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="py-16 text-center space-y-4">
          <p className="text-[15px] text-[#7a7a7a]">
            Coba kata kunci lain, atau lihat semua produk kami.
          </p>
          <Button asChild variant="dark" size="sm" className="text-xs font-bold uppercase">
            <Link href="/products">Lihat Semua Produk</Link>
          </Button>
        </div>
      )}

      {/* Category sections */}
      {result.categories.map((cat) => (
        <section key={cat.id} className="space-y-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#7a7a7a]">
              Kategori
            </p>
            <h2 className="mt-0.5 text-2xl font-semibold uppercase text-foreground">
              {cat.name}
            </h2>
          </div>
          <div className="space-y-8">
            {cat.groups.map((group) => (
              <div key={group.brandId} className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#7a7a7a]">
                  {group.brandName}
                </p>
                <BrandStoreProductGrid products={group.products} />
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Brand sections */}
      {result.brands.map((brand) => (
        <section key={brand.id} className="space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#7a7a7a]">
              Brand
            </p>
            <h2 className="mt-0.5 text-2xl font-semibold uppercase text-foreground">
              {brand.name}
            </h2>
          </div>
          <BrandStoreProductGrid products={brand.products} />
        </section>
      ))}

      {/* Loose products (name match, not already in category/brand sections) */}
      {result.looseProducts.length > 0 && (
        <section className="space-y-4">
          {hasMultipleSections && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#7a7a7a]">
                Produk
              </p>
              <h2 className="mt-0.5 text-2xl font-semibold uppercase text-foreground">
                Lainnya
              </h2>
            </div>
          )}
          <BrandStoreProductGrid products={result.looseProducts} />
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles clean**

Run: `npx tsc --noEmit --pretty`
Expected: exit 0, no new errors

- [ ] **Step 4: Commit**

```
git add lib/data/search-page.ts app/(public)/search/page.tsx
git commit -m "feat(search): build /search page with category, brand, and product sections"
```

---

## Self-Review Checklist

- [x] `q < 2 chars` → redirect to `/products` ✅ (Task 2 Step 2, line 3 of component)
- [x] Products by name search ✅ (Task 1 Step 1, productsRes)
- [x] Categories by name search ✅ (categoriesRes)
- [x] Brands by name search ✅ (brandsRes)
- [x] Category groups fetched via existing `fetchCategoryProductsGroupedByBrand` ✅
- [x] Brand products fetched separately ✅
- [x] Deduplication via `shownIds` Set ✅
- [x] Category section with brand sub-headings + grid ✅
- [x] Brand section with grid ✅
- [x] Loose products section (only heading if multiple sections) ✅
- [x] Empty state with CTA ✅
- [x] Metadata / title tag ✅
- [x] `force-dynamic` ✅
- [x] `BrandStoreProductGrid` reused (DRY, correct grid layout) ✅
- [x] No client components needed ✅
- [x] Types consistent across both files (`SearchResultCategory`, `SearchResultBrand`, `SearchPageResult`) ✅
