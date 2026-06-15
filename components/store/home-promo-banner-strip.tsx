import Link from "next/link";

import type { StoreBanner } from "@/lib/data/home-storefront";
import { cn } from "@/lib/utils";

type HomePromoBannerStripProps = {
  banners: StoreBanner[];
  className?: string;
};

export function HomePromoBannerStrip({ banners, className }: HomePromoBannerStripProps) {
  if (banners.length === 0) return null;
  return (
    <div className={cn("mb-6 w-full max-w-none space-y-3", className)}>
      {banners.map((b) => {
        const img = (
          <div className="relative aspect-[21/9] w-full max-w-none overflow-hidden bg-neutral-100 md:aspect-[24/7]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.image_url}
              alt={b.title ?? ""}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        );
        return (
          <div key={b.id} className="w-full max-w-none overflow-hidden border border-neutral-200">
            {b.link_url ? (
              <Link href={b.link_url} className="block">
                {img}
              </Link>
            ) : (
              img
            )}
          </div>
        );
      })}
    </div>
  );
}
