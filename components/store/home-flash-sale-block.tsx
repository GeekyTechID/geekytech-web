import { HomeProductTile } from "@/components/store/home-product-tile";
import { HorizontalScrollRow } from "@/components/store/horizontal-scroll-row";

import { HOME_HERO_FLASH_SALE_CAMPAIGN_NAME } from "@/lib/constants/home-flash-sale";
import { HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS } from "@/lib/constants/home-product-row-slot";
import type { FlashSaleBlockData } from "@/lib/data/home-storefront";

type HomeFlashSaleBlockProps = {
  /** Data kampanye; beranda memuat kampanye `HOME_HERO_FLASH_SALE_CAMPAIGN_NAME` via `fetchFlashSaleBlockByCampaignName`. */
  block: FlashSaleBlockData | null;
  /** Jika true dan data kosong, tidak me-render apa pun */
  hideWhenEmpty?: boolean;
};

export function HomeFlashSaleBlock({ block, hideWhenEmpty }: HomeFlashSaleBlockProps) {
  if (!block || block.products.length === 0) {
    if (hideWhenEmpty) return null;
    return (
      <section className="border-b border-neutral-200 bg-white py-10 dark:border-border dark:bg-background">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">
            Flash sale{" "}
            <span className="font-medium text-foreground">{HOME_HERO_FLASH_SALE_CAMPAIGN_NAME}</span> tidak ditemukan
            atau belum ada produk. Pastikan di Admin → Flash sale ada kampanye dengan nama persis tersebut (atau dengan
            tanda seru di akhir), kampanye aktif, dan produk flash sale sudah ditambahkan.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-10 dark:border-border dark:bg-background">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="text-xl font-black text-black md:text-xl dark:text-foreground">
            {block.saleName}
          </h3>
        </div>

        {block.subtitle ? (
          <p className="mb-6 max-w-md text-lg leading-relaxed text-black dark:text-muted-foreground">
            {block.subtitle}
          </p>
        ) : null}
        <HorizontalScrollRow gapClass="gap-3 sm:gap-4" fillRow={block.products.length > 0 && block.products.length <= 5}>
          {block.products.length <= 5 ? (
            <>
              {block.products.map((p) => (
                <div key={`${p.productId}-${p.variantId}`} className={HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS}>
                  <HomeProductTile product={p} layout="fluidRow" />
                </div>
              ))}
              {Array.from({ length: Math.max(0, 5 - block.products.length) }, (_, i) => (
                <div key={`flash-row-pad-${i}`} className={HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS} aria-hidden />
              ))}
            </>
          ) : (
            block.products.map((p) => (
              <div key={`${p.productId}-${p.variantId}`} className="shrink-0">
                <HomeProductTile product={p} layout="default" />
              </div>
            ))
          )}
        </HorizontalScrollRow>
      </div>
    </section>
  );
}
