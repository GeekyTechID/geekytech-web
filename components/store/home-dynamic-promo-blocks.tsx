import Link from "next/link";

import { HomePromoBannerStrip } from "@/components/store/home-promo-banner-strip";
import { HomeProductTile } from "@/components/store/home-product-tile";
import { HorizontalScrollRow } from "@/components/store/horizontal-scroll-row";
import { HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS } from "@/lib/constants/home-product-row-slot";

import { fetchDynamicHomePromoBlocks } from "@/lib/data/home-storefront";
import type { DynamicPromoBlock, FetchDynamicHomePromoBlocksOptions } from "@/lib/data/home-storefront";

/** Async server component — fetches its own data and renders. Use inside a Suspense boundary. */
export async function HomeDynamicPromoBlocksFetcher({ excludeFlashSaleIds }: FetchDynamicHomePromoBlocksOptions) {
  let blocks: DynamicPromoBlock[] = [];
  try {
    blocks = await fetchDynamicHomePromoBlocks({ excludeFlashSaleIds });
  } catch {
    blocks = [];
  }
  return <HomeDynamicPromoBlocks blocks={blocks} />;
}

/** Setiap blok promosi: maks. 5 produk tampil sekaligus; sisanya geser kiri/kanan. */
export function HomeDynamicPromoBlocks({ blocks }: { blocks: DynamicPromoBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-0 mb-10">
      {blocks.map((block, blockIndex) => (
        <section
          key={`${block.sectionKey}-${blockIndex}`}
          className="bg-background py-8 sm:py-10 [content-visibility:auto] [contain-intrinsic-size:auto_400px]"
        >
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            {block.banners.length > 0 ? (
              <HomePromoBannerStrip banners={block.banners} className="mb-6 sm:mb-8" />
            ) : null}

            <div className="mb-6 mt-4 space-y-2 sm:mt-5">
              <div className="flex items-start justify-between gap-3">
                {block.linkUrl ? (
                  <Link href={block.linkUrl} className="group inline-block">
                    <h3 className="text-base font-bold leading-snug text-foreground transition-colors group-hover:text-brand sm:text-lg">
                      {block.title}
                    </h3>
                  </Link>
                ) : (
                  <h3 className="text-base font-bold leading-snug text-foreground sm:text-lg">
                    {block.title}
                  </h3>
                )}
                {block.linkUrl ? (
                  <Link
                    href={block.linkUrl}
                    className="shrink-0 text-sm font-semibold text-brand transition hover:text-[#d44820]"
                  >
                    Lihat Semua
                  </Link>
                ) : null}
              </div>
              {block.subtitle ? (
                <p className="max-w-2xl text-base font-normal leading-relaxed text-muted-foreground sm:text-lg">
                  {block.subtitle}
                </p>
              ) : null}
            </div>

            {block.products.length > 0 ? (
              <HorizontalScrollRow
                gapClass="gap-3 sm:gap-4"
                fillRow={block.products.length <= 5}
                itemsPerSlide={5}
              >
                {block.products.length <= 5 ? (
                  <>
                    {block.products.map((p) => (
                      <div key={`${p.productId}-${p.variantId}`} className={HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS}>
                        <HomeProductTile product={p} layout="fluidRow" />
                      </div>
                    ))}
                    {Array.from({ length: 5 - block.products.length }, (_, i) => (
                      <div key={`pad-${blockIndex}-${i}`} className={HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS} aria-hidden />
                    ))}
                  </>
                ) : (
                  block.products.map((p) => (
                    <div key={`${p.productId}-${p.variantId}`} className={HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS}>
                      <HomeProductTile product={p} layout="promoRow" className="h-full" />
                    </div>
                  ))
                )}
              </HorizontalScrollRow>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
