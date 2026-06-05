"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CarouselNavButton } from "@/components/ui/carousel-nav-button";
import { cn } from "@/lib/utils";

type HorizontalScrollRowProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Jarak antar item (Tailwind gap) */
  gapClass?: string;
  /**
   * @deprecated Lebar baris kini ditangani oleh `flex-1` pada scroll container.
   * Prop ini masih diterima agar caller tidak perlu diubah.
   */
  fillRow?: boolean;
};

export function HorizontalScrollRow({
  children,
  className,
  contentClassName,
  gapClass = "gap-4",
  fillRow: _fillRow,
}: HorizontalScrollRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showChevrons, setShowChevrons] = useState(false);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const scrollable = el.scrollWidth > el.clientWidth + 2;
    setShowChevrons(scrollable);
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  const scrollByDir = useCallback((dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const firstSlot = el.firstElementChild as HTMLElement | null;
    if (firstSlot) {
      const gap = parseFloat(getComputedStyle(el).gap) || 0;
      el.scrollBy({ left: dir * (firstSlot.offsetWidth + gap), behavior: "smooth" });
    } else {
      el.scrollBy({ left: Math.round(el.clientWidth * 0.85) * dir, behavior: "smooth" });
    }
  }, []);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showChevrons ? (
        <CarouselNavButton
          direction="prev"
          surface="surface"
          aria-label="Geser kiri"
          onClick={() => scrollByDir(-1)}
          disabled={!canLeft}
          className={cn("shrink-0", !canLeft && "pointer-events-none opacity-40")}
        />
      ) : null}

      <div
        ref={ref}
        className={cn(
          "flex-1 min-w-0",
          "flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-1",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          gapClass,
          contentClassName,
        )}
      >
        {children}
      </div>

      {showChevrons ? (
        <CarouselNavButton
          direction="next"
          surface="surface"
          aria-label="Geser kanan"
          onClick={() => scrollByDir(1)}
          disabled={!canRight}
          className={cn("shrink-0", !canRight && "pointer-events-none opacity-40")}
        />
      ) : null}
    </div>
  );
}
