import { HomePromoBannerStrip } from "@/components/store/home-promo-banner-strip";
import { HomeProductTile } from "@/components/store/home-product-tile";
import { HorizontalScrollRow } from "@/components/store/horizontal-scroll-row";
import { HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS } from "@/lib/constants/home-product-row-slot";

import type { DynamicPromoBlock } from "@/lib/data/home-storefront";

/** Setiap blok promosi: maks. 5 produk tampil sekaligus; sisanya geser kiri/kanan. */
export function HomeDynamicPromoBlocks({ blocks }: { blocks: DynamicPromoBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-0 mb-10">
      {blocks.map((block, blockIndex) => (
        <section
          key={`${block.sectionKey}-${blockIndex}`}
          className="bg-white py-10 dark:border-border dark:bg-background"
        >
          {block.banners.length > 0 ? (
            <div className="relative left-1/2 w-screen max-w-none -translate-x-1/2">
              <HomePromoBannerStrip banners={block.banners} className="mb-0 w-full max-w-none" />
            </div>
          ) : null}

          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className={block.banners.length > 0 ? "mb-6 mt-10 space-y-2" : "mb-6 space-y-2"}>
              <h3 className="text-lg font-bold text-black dark:text-foreground">{block.title}</h3>
              {block.subtitle ? (
                <p className="max-w-2xl text-lg font-normal max-w-sm leading-relaxed text-neutral-600 dark:text-muted-foreground">
                  {block.subtitle}
                </p>
              ) : null}
            </div>

            {block.products.length > 0 ? (
              <HorizontalScrollRow
                gapClass="gap-3 sm:gap-4"
                fillRow={block.products.length <= 5}
              >
                {block.products.map((p) => (
                  <div key={`${p.productId}-${p.variantId}`} className={HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS}>
                    <HomeProductTile product={p} layout="fluidRow" />
                  </div>
                ))}
                {block.products.length <= 5
                  ? Array.from({ length: 5 - block.products.length }, (_, i) => (
                      <div key={`pad-${blockIndex}-${i}`} className={HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS} aria-hidden />
                    ))
                  : null}
              </HorizontalScrollRow>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
