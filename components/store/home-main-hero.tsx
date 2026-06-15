"use client";

import { memo, useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { CarouselDots } from "@/components/ui/carousel-dots";
import { CarouselNavButton } from "@/components/ui/carousel-nav-button";
import type { StoreBanner } from "@/lib/data/home-storefront";
const AUTO_MS = 6500;

type HomeMainHeroProps = {
  banners: StoreBanner[];
  hideNav?: boolean;
};

const HeroSlide = memo(function HeroSlide({ banner, priority }: { banner: StoreBanner; priority: boolean }) {
  const inner = (
    <div className="relative aspect-[21/9] w-full min-h-[200px] overflow-hidden sm:min-h-[220px] md:aspect-[24/7] md:min-h-[280px] lg:min-h-[360px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- URL banner dari admin bisa domain eksternal */}
      <img
        src={banner.image_url}
        alt={banner.title ?? ""}
        className="absolute inset-0 h-full w-full object-cover object-center"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
    </div>
  );

  if (banner.link_url) {
    return (
      <Link
        href={banner.link_url}
        className="block min-w-full shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {inner}
      </Link>
    );
  }

  return <div className="min-w-full shrink-0">{inner}</div>;
});

export function HomeMainHero({ banners, hideNav = false }: HomeMainHeroProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const n = banners.length;

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n <= 1) return;
      setIndex((i) => (i + dir + n) % n);
    },
    [n],
  );

  useEffect(() => {
    if (n <= 1 || isPaused) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % n);
    }, AUTO_MS);
    return () => window.clearInterval(t);
  }, [n, isPaused]);

  const handleFocus = useCallback((e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsPaused(true);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsPaused(false);
  }, []);

  if (n === 0) {
    return (
      <section className="border-b border-neutral-200 bg-neutral-900 py-16 text-center text-white">
        <h1 className="sr-only">GeekyTech</h1>
        <p className="text-sm font-medium text-white/70">Belum ada banner utama. Atur di Admin → Promosi → Main Banner.</p>
      </section>
    );
  }

  return (
    <section
      className="group/hero relative shadow-[0_12px_24px_-18px_rgba(0,0,0,0.35)]"
      aria-roledescription="carousel"
      aria-label="Banner utama"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <h1 className="sr-only">GeekyTech — Toko Tech & Gadget</h1>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {n > 1 ? (banners[index]?.title ?? `Slide ${index + 1} dari ${n}`) : null}
      </div>
      <div className="relative grid w-full overflow-hidden">
        <div
          className="col-start-1 row-start-1 flex min-w-0 transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {banners.map((banner, i) => (
            <HeroSlide key={banner.id} banner={banner} priority={i === 0} />
          ))}
        </div>

        {n > 1 && !hideNav ? (
          <>
            <div
              className="pointer-events-none col-start-1 row-start-1 z-20 flex w-full min-h-0 items-center justify-between self-stretch px-3 sm:px-4 md:px-5"
              aria-hidden
            >
              <CarouselNavButton
                direction="prev"
                surface="on-photo"
                onClick={() => go(-1)}
                className="pointer-events-auto shrink-0"
                aria-label="Banner sebelumnya"
              />
              <CarouselNavButton
                direction="next"
                surface="on-photo"
                onClick={() => go(1)}
                className="pointer-events-auto shrink-0"
                aria-label="Banner berikutnya"
              />
            </div>
            <CarouselDots
              count={n}
              activeIndex={index}
              onSelect={setIndex}
              className="pointer-events-auto col-start-1 row-start-1 z-10 self-end justify-self-center pb-3 sm:pb-4"
              tone="light"
            />
          </>
        ) : null}
      </div>
    </section>
  );
}
