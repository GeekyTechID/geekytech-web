import Link from "next/link";

import { HomeProductTile } from "@/components/store/home-product-tile";
import { HorizontalScrollRow } from "@/components/store/horizontal-scroll-row";

import { HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS } from "@/lib/constants/home-product-row-slot";
import type { HomeShelfProduct } from "@/lib/data/home-storefront";

type HomeLatestProductsSectionProps = {
  products: HomeShelfProduct[];
};

/** Section "Produk Terbaru" — selalu tampil di beranda, di bawah Flash Sale. */
export function HomeLatestProductsSection({ products }: HomeLatestProductsSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="bg-background py-8 sm:py-10">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-5 space-y-1 sm:mb-6">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-black leading-snug text-foreground sm:text-lg">
              Produk Terbaru
            </h3>
            <Link
              href="/products"
              className="shrink-0 text-sm font-semibold text-brand transition hover:text-[#d44820]"
            >
              Lihat Semua
            </Link>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Kurasi dari katalog aktif GeekyTech — buka halaman produk untuk varian lengkap.
          </p>
        </div>

        <HorizontalScrollRow gapClass="gap-3 sm:gap-4" fillRow={products.length <= 5} itemsPerSlide={5}>
          {products.length <= 5 ? (
            <>
              {products.map((p) => (
                <div key={`${p.productId}-${p.variantId}`} className={HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS}>
                  <HomeProductTile product={p} layout="fluidRow" />
                </div>
              ))}
              {Array.from({ length: Math.max(0, 5 - products.length) }, (_, i) => (
                <div key={`latest-row-pad-${i}`} className={HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS} aria-hidden />
              ))}
            </>
          ) : (
            products.map((p) => (
              <div key={`${p.productId}-${p.variantId}`} className={HOME_PRODUCT_RESPONSIVE_ROW_SLOT_CLASS}>
                <HomeProductTile product={p} layout="promoRow" className="h-full" />
              </div>
            ))
          )}
        </HorizontalScrollRow>
      </div>
    </section>
  );
}
