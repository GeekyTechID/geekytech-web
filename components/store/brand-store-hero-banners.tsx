import Link from "next/link";

import {
  STORE_BANNER_IMAGE_CLASS,
  STORE_BANNER_MEDIA_CLASS,
  STORE_BANNER_SURFACE_CLASS,
} from "@/lib/constants/store-banner";
import type { StoreBanner } from "@/lib/data/home-storefront";

function BannerFigure({ banner }: { banner: StoreBanner }) {
  const inner = (
    <div className={STORE_BANNER_MEDIA_CLASS}>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL dari admin */}
      <img
        src={banner.image_url}
        alt={banner.title ?? "Banner promosi"}
        className={STORE_BANNER_IMAGE_CLASS}
        loading="eager"
        decoding="async"
      />
    </div>
  );
  return (
    <div className={`border border-[#e0e0e0] bg-white ${STORE_BANNER_SURFACE_CLASS}`}>
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
