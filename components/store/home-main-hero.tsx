"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { StoreBanner } from "@/lib/data/home-storefront";
import { cn } from "@/lib/utils";

const AUTO_MS = 6500;

type HomeMainHeroProps = {
  banners: StoreBanner[];
  hideNav?: boolean;
};

function HeroSlide({ banner, priority }: { banner: StoreBanner; priority: boolean }) {
  const inner = (
    <div className="relative grid min-h-[220px] overflow-hidden md:min-h-[320px] lg:min-h-[400px]">
      <div className="relative min-h-[220px] md:min-h-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL banner dari admin bisa domain eksternal */}
        <img
          src={banner.image_url}
          alt={banner.title ?? "Banner promosi"}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      </div>
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
}

export function HomeMainHero({ banners, hideNav = false }: HomeMainHeroProps) {
  const [index, setIndex] = useState(0);
  const n = banners.length;

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n <= 1) return;
      setIndex((i) => (i + dir + n) % n);
    },
    [n],
  );

  useEffect(() => {
    if (n <= 1) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % n);
    }, AUTO_MS);
    return () => window.clearInterval(t);
  }, [n]);

  if (n === 0) {
    return (
      <section className="border-b border-neutral-200 bg-neutral-900 py-16 text-center text-white dark:border-border">
        <p className="text-sm font-medium text-white/70">Belum ada banner utama. Atur di Admin → Promosi → Main Banner.</p>
      </section>
    );
  }

  return (
    <section
      className="group/hero relative shadow-[0_12px_24px_-18px_rgba(0,0,0,0.35)] dark:border-border"
      aria-roledescription="carousel"
      aria-label="Banner utama"
    >
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {banners.map((banner, i) => (
            <HeroSlide key={banner.id} banner={banner} priority={i === 0} />
          ))}
        </div>
      </div>

      {n > 1 && !hideNav && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 md:left-5"
            aria-label="Banner sebelumnya"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 md:right-5"
            aria-label="Banner berikutnya"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70",
                )}
                aria-label={`Banner ${i + 1} dari ${n}`}
                aria-current={i === index}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
