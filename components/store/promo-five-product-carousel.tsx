"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { HomeProductTile } from "@/components/store/home-product-tile";
import type { HomeShelfProduct } from "@/lib/data/home-storefront";
import { HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS } from "@/lib/constants/home-product-row-slot";
import { cn } from "@/lib/utils";

const VISIBLE = 5;

type PromoFiveProductCarouselProps = {
  products: HomeShelfProduct[];
  "aria-label"?: string;
};

export function PromoFiveProductCarousel({ products, "aria-label": ariaLabel }: PromoFiveProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(products.length > VISIBLE);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    return () => el.removeEventListener("scroll", updateArrows);
  }, [updateArrows]);

  const go = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstSlot = el.firstElementChild as HTMLElement | null;
    if (!firstSlot) return;
    const gap = parseFloat(getComputedStyle(el).gap) || 12;
    el.scrollTo({ left: el.scrollLeft + dir * (firstSlot.offsetWidth + gap), behavior: "smooth" });
  }, []);

  if (products.length === 0) return null;

  const showChevrons = products.length > VISIBLE;

  return (
    <div
      className="relative"
      role="region"
      aria-label={ariaLabel ?? "Deretan produk"}
    >
      {showChevrons && (
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={!canLeft}
          className={cn(
            "absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-sm transition hover:bg-neutral-50 sm:left-2 dark:border-border dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800",
            !canLeft && "pointer-events-none opacity-40",
          )}
          aria-label="Produk sebelumnya"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {showChevrons && (
        <button
          type="button"
          onClick={() => go(1)}
          disabled={!canRight}
          className={cn(
            "absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-sm transition hover:bg-neutral-50 sm:right-2 dark:border-border dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800",
            !canRight && "pointer-events-none opacity-40",
          )}
          aria-label="Produk berikutnya"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-1 gap-3 sm:gap-4",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          showChevrons && "pl-14 pr-14 sm:pl-16 sm:pr-16 md:pl-[4.5rem] md:pr-[4.5rem] lg:pl-20 lg:pr-20",
        )}
      >
        {products.map((p) => (
          <div
            key={`${p.productId}-${p.variantId}`}
            className={cn(HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS, "snap-start")}
          >
            <HomeProductTile product={p} layout="promoRow" />
          </div>
        ))}
      </div>
    </div>
  );
}
