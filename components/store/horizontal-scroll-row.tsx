"use client";

import { useCallback, useRef } from "react";

import { CarouselNavButton } from "@/components/ui/carousel-nav-button";
import { cn } from "@/lib/utils";

type HorizontalScrollRowProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Jarak antar item (Tailwind gap) */
  gapClass?: string;
  /** Isi lebar baris (mis. ≤5 produk agar tidak ada ruang kosong) */
  fillRow?: boolean;
};

export function HorizontalScrollRow({
  children,
  className,
  contentClassName,
  gapClass = "gap-4",
  fillRow = false,
}: HorizontalScrollRowProps) {
  const ref = useRef<HTMLDivElement>(null);

  const scrollByDir = useCallback((dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const delta = Math.round(el.clientWidth * 0.85) * dir;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  return (
    <div className={cn("relative group/scroll", className)}>
      <CarouselNavButton
        direction="prev"
        surface="surface"
        aria-label="Geser kiri"
        onClick={() => scrollByDir(-1)}
        className="absolute left-0 top-1/2 z-10 -translate-y-1/2 md:hidden"
      />
      <CarouselNavButton
        direction="next"
        surface="surface"
        aria-label="Geser kanan"
        onClick={() => scrollByDir(1)}
        className="absolute right-0 top-1/2 z-10 -translate-y-1/2 md:hidden"
      />
      <div
        ref={ref}
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] px-8 sm:px-10 md:px-0",
          fillRow && "min-w-full !w-full",
          gapClass,
          "[&::-webkit-scrollbar]:hidden",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
