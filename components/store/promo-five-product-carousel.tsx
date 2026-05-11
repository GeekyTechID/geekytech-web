"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { HomeProductTile } from "@/components/store/home-product-tile";
import type { HomeShelfProduct } from "@/lib/data/home-storefront";
import { HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS } from "@/lib/constants/home-product-row-slot";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;

function chunkProducts(items: HomeShelfProduct[], size: number): HomeShelfProduct[][] {
  const pages: HomeShelfProduct[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

type PromoFiveProductCarouselProps = {
  products: HomeShelfProduct[];
  /** Label aksesibilitas untuk area carousel */
  "aria-label"?: string;
};

export function PromoFiveProductCarousel({ products, "aria-label": ariaLabel }: PromoFiveProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pages = chunkProducts(products, PAGE_SIZE);
  const [pageIndex, setPageIndex] = useState(0);

  const scrollToPage = useCallback(
    (i: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(i, pages.length - 1));
      el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
      setPageIndex(clamped);
    },
    [pages.length],
  );

  const goDir = useCallback(
    (dir: -1 | 1) => {
      const el = scrollRef.current;
      if (!el || pages.length <= 1) return;
      const w = el.clientWidth;
      if (w <= 0) return;
      const current = Math.round(el.scrollLeft / w);
      scrollToPage(current + dir);
    },
    [pages.length, scrollToPage],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || pages.length <= 1) return;

    const onScroll = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      const i = Math.round(el.scrollLeft / w);
      setPageIndex(Math.max(0, Math.min(i, pages.length - 1)));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [pages.length]);

  if (products.length === 0) return null;

  return (
    <div
      className="relative"
      role="region"
      aria-label={ariaLabel ?? "Deretan produk"}
      aria-roledescription={pages.length > 1 ? "carousel" : undefined}
    >
      {pages.length > 1 && (
        <button
          type="button"
          onClick={() => goDir(-1)}
          disabled={pageIndex <= 0}
          className={cn(
            "absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-sm transition hover:bg-neutral-50 sm:left-2 dark:border-border dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800",
            pageIndex <= 0 && "pointer-events-none opacity-40",
          )}
          aria-label="Halaman produk sebelumnya"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {pages.length > 1 && (
        <button
          type="button"
          onClick={() => goDir(1)}
          disabled={pageIndex >= pages.length - 1}
          className={cn(
            "absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-sm transition hover:bg-neutral-50 sm:right-2 dark:border-border dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800",
            pageIndex >= pages.length - 1 && "pointer-events-none opacity-40",
          )}
          aria-label="Halaman produk berikutnya"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none]",
          "pl-14 pr-14 sm:pl-16 sm:pr-16 md:pl-[4.5rem] md:pr-[4.5rem] lg:pl-20 lg:pr-20",
          "[&::-webkit-scrollbar]:hidden",
        )}
      >
        {pages.map((group, pageI) => (
          <div
            key={pageI}
            className="flex min-w-full shrink-0 snap-start gap-3 sm:gap-4"
          >
            {group.map((p) => (
              <div key={`${p.productId}-${p.variantId}`} className={HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS}>
                <HomeProductTile product={p} layout="promoRow" />
              </div>
            ))}
            {Array.from({ length: Math.max(0, PAGE_SIZE - group.length) }, (_, i) => (
              <div key={`pad-${pageI}-${i}`} className={HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS} aria-hidden />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
