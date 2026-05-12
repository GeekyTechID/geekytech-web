import Link from "next/link";

import type { StoreBanner } from "@/lib/data/home-storefront";

function BannerFigure({ banner }: { banner: StoreBanner }) {
  /** Tinggi mengikuti `HomeMainHero` / `HeroSlide` (min-h responsif, gambar object-cover). */
  const inner = (
    <div className="relative grid min-h-[220px] overflow-hidden md:min-h-[320px] lg:min-h-[400px]">
      <div className="relative min-h-[220px] md:min-h-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL dari admin */}
        <img
          src={banner.image_url}
          alt={banner.title ?? "Banner promosi"}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  );
  return (
    <div className="overflow-hidden border border-[#e0e0e0] bg-white">
      {banner.link_url ? (
        <Link href={banner.link_url} className="block">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
}

export function BrandStoreHeroBanners({ banners }: { banners: StoreBanner[] }) {
  if (banners.length === 0) return null;
  if (banners.length === 1) {
    return (
      <div className="mb-8">
        <BannerFigure banner={banners[0]} />
      </div>
    );
  }
  const [first, second, ...rest] = banners;
  return (
    <div className="mb-8 space-y-3 md:space-y-0">
      <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:gap-4">
        <BannerFigure banner={first} />
        {second ? <BannerFigure banner={second} /> : null}
      </div>
      {rest.length > 0 ? (
        <div className="space-y-3 pt-2">
          {rest.map((b) => (
            <BannerFigure key={b.id} banner={b} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
