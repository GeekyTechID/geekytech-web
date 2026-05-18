import Image from "next/image";
import { Star } from "lucide-react";

import { HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS } from "@/lib/constants/home-product-row-slot";
import { HomeProductTile } from "@/components/store/home-product-tile";
import type { BrandStoreAggregate, BrandStorePublicBrand } from "@/lib/data/brand-store-page";
import type { HomeShelfProduct } from "@/lib/data/home-storefront";

type BrandStoreBrandOverviewProps = {
  brand: BrandStorePublicBrand;
  aggregate: BrandStoreAggregate;
  bestSellers: HomeShelfProduct[];
};

function formatRating(value: number): string {
  if (value <= 0 || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

export function BrandStoreBrandOverview({ brand, aggregate, bestSellers }: BrandStoreBrandOverviewProps) {
  const pad = Math.max(0, 5 - bestSellers.length);

  return (
    <section className="bg-white pb-10 pt-2">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <div className="flex shrink-0 items-start gap-6 lg:max-w-[min(100%,20rem)]">
            {brand.logo_url ? (
              <div className="relative h-14 w-40 shrink-0 sm:h-16 sm:w-48">
                <Image
                  src={brand.logo_url}
                  alt={brand.name}
                  fill
                  className="object-contain object-left"
                  sizes="(min-width: 640px) 192px, 160px"
                  priority
                />
              </div>
            ) : (
              <p className="text-xl font-semibold text-[#1d1d1f]">{brand.name}</p>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {brand.description ? (
              <p className="max-w-3xl text-[17px] leading-[1.47] text-[#1d1d1f]">{brand.description}</p>
            ) : (
              <p className="max-w-3xl text-sm text-[#1d1d1f]">
                Belum ada deskripsi merek. Tambahkan di Admin → Brand setelah migrasi kolom `description` diterapkan.
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-row justify-between items-center gap-3 text-sm text-[#1d1d1f] lg:text-right">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500" aria-hidden />
              <span className="font-semibold">{formatRating(aggregate.avgRating)}</span>
              <span className="text-[#1d1d1f]">
                ({aggregate.totalReviews.toLocaleString("id-ID")} rating)
              </span>
            </div>

            <div className="size-1 bg-black/50 rounded-full"></div>

            <p className="text-[#1d1d1f]">
              <span className="font-medium text-[#1d1d1f]">{aggregate.totalSold.toLocaleString("id-ID")}</span> terjual
            </p>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-[21px] font-semibold leading-snug text-[#1d1d1f]">Produk terlaris</h2>
          {bestSellers.length === 0 ? (
            <p className="mt-4 text-sm text-[#7a7a7a]">Belum ada produk terjual untuk merek ini.</p>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3 sm:gap-4">
              {bestSellers.map((p) => (
                <div key={`${p.productId}-${p.variantId}`} className={HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS}>
                  <HomeProductTile product={p} layout="fluidRow" />
                </div>
              ))}
              {Array.from({ length: pad }, (_, i) => (
                <div key={`bestseller-pad-${i}`} className={HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS} aria-hidden />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
