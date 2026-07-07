import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BrandStoreBrandOverview } from "@/components/store/brand-store-brand-overview";
import { BrandStoreCatalogFilters } from "@/components/store/brand-store-catalog-filters";
import { BrandStoreHeroBanners } from "@/components/store/brand-store-hero-banners";
import { BrandStorePagination } from "@/components/store/brand-store-pagination";
import { BrandStoreProductGrid } from "@/components/store/brand-store-product-grid";
import { HomePromoBannerStrip } from "@/components/store/home-promo-banner-strip";
import { brandMainBannersTemplate, brandSecondaryBannersTemplate } from "@/lib/brand-page-banner-template";
import {
  brandHeroBannersFromTable,
  brandSecondaryBannersFromTable,
  fetchBrandAggregateFromProducts,
  fetchBrandBestSellers,
  fetchBrandBySlugForStore,
  fetchBrandCategoryFilters,
  fetchBrandProductsPage,
  fetchPreFooterBanners,
} from "@/lib/data/brand-store-page";
import { fetchTemplateBanners } from "@/lib/data/home-storefront";

export const dynamic = "force-dynamic";

type PageParams = Promise<{ slug: string }>;
type SearchParams = Promise<{ page?: string; q?: string; category?: string; sort?: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await fetchBrandBySlugForStore(slug);
  if (!brand) return { title: "Brand tidak ditemukan" };
  return {
    title: `${brand.name} — Produk`,
    description: brand.description ?? `Katalog produk ${brand.name} di GeekyTech.`,
  };
}

export default async function BrandProductListPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = sp.q ?? "";
  const categoryId = sp.category ?? "";
  const sort = sp.sort ?? "latest";

  const brand = await fetchBrandBySlugForStore(slug);
  if (!brand) notFound();

  const [
    heroFromTemplate,
    secondaryFromTemplate,
    aggregate,
    bestSellers,
    categories,
    listResult,
    preFooterBanners,
  ] = await Promise.all([
    fetchTemplateBanners(brandMainBannersTemplate(brand.slug)),
    fetchTemplateBanners(brandSecondaryBannersTemplate(brand.slug)),
    fetchBrandAggregateFromProducts(brand.id),
    fetchBrandBestSellers(brand.id, 5),
    fetchBrandCategoryFilters(brand.id),
    fetchBrandProductsPage({
      brandId: brand.id,
      page,
      q,
      categoryId: categoryId || null,
      sort,
    }),
    fetchPreFooterBanners(),
  ]);

  const heroBanners =
    heroFromTemplate.length > 0 ? heroFromTemplate : brandHeroBannersFromTable(brand);
  const secondaryBanners =
    secondaryFromTemplate.length > 0 ? secondaryFromTemplate : brandSecondaryBannersFromTable(brand);

  const basePath = `/brands/${encodeURIComponent(brand.slug)}`;

  return (
    <div className="bg-white text-[#1d1d1f]">
      <div className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6 lg:px-24">
        <BrandStoreHeroBanners banners={heroBanners} />
      </div>

      <BrandStoreBrandOverview brand={brand} aggregate={aggregate} bestSellers={bestSellers} />

      <section className="bg-white py-10">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          {secondaryBanners.length > 0 ? (
            <div className="mb-10">
              <HomePromoBannerStrip banners={secondaryBanners} />
            </div>
          ) : null}

          <Suspense
            fallback={
              <div className="mb-8 h-11 w-full max-w-xl animate-pulse rounded-full bg-[#f5f5f7]" aria-hidden />
            }
          >
            <BrandStoreCatalogFilters categories={categories} />
          </Suspense>

          <div className="mt-8">
            <BrandStoreProductGrid products={listResult.products} brandName={brand.name} />
          </div>

          <BrandStorePagination
            basePath={basePath}
            currentPage={page}
            totalCount={listResult.totalCount}
            q={q}
            categoryId={categoryId}
            sort={sort}
          />
        </div>
      </section>

      {preFooterBanners.length > 0 ? (
        <section className="bg-[#f5f5f7] py-10">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
            <HomePromoBannerStrip banners={preFooterBanners} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
