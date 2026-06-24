import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductsCatalogFilters } from "@/components/store/products-catalog-filters";
import { ProductsCatalogGrid } from "@/components/store/products-catalog-grid";
import { ProductsCatalogPagination } from "@/components/store/products-catalog-pagination";
import { fetchBrandBySlugForStore } from "@/lib/data/brand-store-page";
import { fetchActiveCategoriesForProductIndex, fetchCategoryBySlugForStore } from "@/lib/data/category-store-page";
import { fetchActiveBrandsForCatalog, fetchProductsCatalogPage } from "@/lib/data/products-catalog-page";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  category?: string;
  brand?: string;
  q?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  rating?: string;
  page?: string;
}>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const categorySlug = sp.category?.trim();
  const brandSlug = sp.brand?.trim();

  if (categorySlug) {
    const cat = await fetchCategoryBySlugForStore(categorySlug);
    if (cat) {
      return { title: `${cat.name} — GeekyTech`, description: `Telusuri produk ${cat.name} di GeekyTech.` };
    }
  }
  if (brandSlug) {
    const brand = await fetchBrandBySlugForStore(brandSlug);
    if (brand) {
      return { title: `${brand.name} — GeekyTech`, description: `Telusuri produk ${brand.name} di GeekyTech.` };
    }
  }
  return {
    title: "Semua Produk — GeekyTech",
    description: "Telusuri katalog GeekyTech: filter kategori, brand, harga, dan rating, lalu urutkan sesuai kebutuhanmu.",
  };
}

export default async function ProductsHubPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const categorySlug = sp.category?.trim() ?? "";
  const brandSlug = sp.brand?.trim() ?? "";
  const q = sp.q?.trim() ?? "";
  const sort = sp.sort?.trim() ?? "latest";
  const minPrice = sp.minPrice?.trim() ?? "";
  const maxPrice = sp.maxPrice?.trim() ?? "";
  const rating = sp.rating?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [category, brand] = await Promise.all([
    categorySlug ? fetchCategoryBySlugForStore(categorySlug) : Promise.resolve(null),
    brandSlug ? fetchBrandBySlugForStore(brandSlug) : Promise.resolve(null),
  ]);

  if (categorySlug && !category) notFound();
  if (brandSlug && !brand) notFound();

  const [categories, brands, listResult] = await Promise.all([
    fetchActiveCategoriesForProductIndex(),
    fetchActiveBrandsForCatalog(),
    fetchProductsCatalogPage({
      page,
      q,
      categoryId: category?.id ?? null,
      brandId: brand?.id ?? null,
      sort,
      minPrice: minPrice ? Number(minPrice) : null,
      maxPrice: maxPrice ? Number(maxPrice) : null,
      minRating: rating ? Number(rating) : null,
    }),
  ]);

  const hasActiveFilters = Boolean(q || categorySlug || brandSlug || minPrice || maxPrice || rating);
  const title = category?.name ?? brand?.name ?? "Semua Produk";
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    ...(category || brand ? [{ label: "Produk", href: "/products" }] : []),
    { label: title },
  ];

  return (
    <div className="bg-white text-foreground">
      <nav aria-label="Breadcrumb" className="border-b border-[#e0e0e0] bg-white py-3">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <ol className="scrollbar-none flex min-w-0 items-center gap-2 overflow-x-auto py-1 text-[13px]">
            {breadcrumbItems.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                {i > 0 && (
                  <span className="text-[#c8c8cc]" aria-hidden>
                    /
                  </span>
                )}
                {item.href ? (
                  <Link href={item.href} className="text-muted-foreground transition-colors hover:text-foreground">
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground" aria-current="page">
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <section className="py-8 sm:py-10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="mb-6 space-y-1">
            <h1 className="text-xl font-black leading-tight text-foreground sm:text-2xl md:text-[28px]">{title}</h1>
            <p className="text-sm text-muted-foreground">{listResult.totalCount} produk ditemukan</p>
          </div>

          <Suspense
            fallback={<div className="mb-6 h-11 w-full max-w-xl animate-pulse rounded-full bg-[#f5f5f7]" aria-hidden />}
          >
            <ProductsCatalogFilters categories={categories} brands={brands} />
          </Suspense>

          <div className="mt-6">
            <ProductsCatalogGrid products={listResult.products} hasActiveFilters={hasActiveFilters} />
          </div>

          <ProductsCatalogPagination
            currentPage={page}
            totalCount={listResult.totalCount}
            q={q}
            category={categorySlug}
            brand={brandSlug}
            sort={sort}
            minPrice={minPrice}
            maxPrice={maxPrice}
            rating={rating}
          />
        </div>
      </section>
    </div>
  );
}
