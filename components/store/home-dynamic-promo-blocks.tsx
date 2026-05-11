import { HomePromoBannerStrip } from "@/components/store/home-promo-banner-strip";
import { PromoFiveProductCarousel } from "@/components/store/promo-five-product-carousel";

import type { DynamicPromoBlock } from "@/lib/data/home-storefront";

/** Setiap blok promosi: maks. 5 produk tampil sekaligus; jika lebih dari 5, pakai chevron kiri/kanan (`PromoFiveProductCarousel`). */
export function HomeDynamicPromoBlocks({ blocks }: { blocks: DynamicPromoBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-0">
      {blocks.map((block, blockIndex) => (
        <section
          key={`${block.sectionKey}-${blockIndex}`}
          className="border-b border-neutral-200 bg-white py-10 dark:border-border dark:bg-background"
        >
          {block.banners.length > 0 ? (
            <div className="relative left-1/2 w-screen max-w-none -translate-x-1/2">
              <HomePromoBannerStrip banners={block.banners} className="mb-0 w-full max-w-none" />
            </div>
          ) : null}

          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className={block.banners.length > 0 ? "mb-6 mt-10 space-y-2" : "mb-6 space-y-2"}>
              <h3 className="text-xl font-normal text-black md:text-xl dark:text-foreground">{block.title}</h3>
              {block.subtitle ? (
                <p className="max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-muted-foreground">
                  {block.subtitle}
                </p>
              ) : null}
            </div>

            {block.products.length > 0 ? (
              <PromoFiveProductCarousel
                products={block.products}
                aria-label={`${block.title}: produk, lima per halaman. Gunakan panah jika lebih dari lima item.`}
              />
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
