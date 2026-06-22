import Image from "next/image";
import Link from "next/link";

import type { ShopBrand } from "@/lib/data/home-storefront";

type ShopByBrandSectionProps = {
  brands: ShopBrand[];
  showSeeAllLink?: boolean;
  /** Batasi jumlah logo ditampilkan (mis. teaser di beranda). Default: tampilkan semua. */
  limit?: number;
};

export function ShopByBrandSection({ brands, showSeeAllLink = true, limit }: ShopByBrandSectionProps) {
  const filteredBrands = brands.filter((b) => b.name.toLowerCase() !== "lainnya");
  const visibleBrands = limit ? filteredBrands.slice(0, limit) : filteredBrands;

  return (
    <section className="bg-background py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-black leading-snug text-foreground sm:text-lg">
            Authorized Brand
          </h2>
          {showSeeAllLink ? (
            <Link
              href="/brands"
              className="shrink-0 text-sm font-semibold text-brand transition hover:text-[#d44820]"
            >
              Lihat Semua
            </Link>
          ) : null}
        </div>

        <p className="mt-3 max-w-md text-lg leading-relaxed text-muted-foreground">
          Brand-brand tech terpercaya — semua produk original bergaransi resmi, langsung dari distributor resmi di Indonesia.
        </p>

        {visibleBrands.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">Belum ada merek aktif.</p>
        ) : (
          <div className="mt-10 grid justify-start items-start grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visibleBrands.map((b) => (
              <Link
                key={b.id}
                href={`/brands/${encodeURIComponent(b.slug)}`}
                className="cursor-pointer group flex items-center justify-center overflow-hidden transition hover:border-brand/40"
              >
                {b.logo_url ? (
                  <div className="relative h-14 w-full sm:h-18 transition group-hover:grayscale-0">
                    <Image src={b.logo_url} alt={b.name} fill className="object-contain" sizes="(min-width: 1024px) 260px, (min-width: 768px) 210px, (min-width: 640px) 190px, calc(50vw - 2rem)" />
                  </div>
                ) : (
                  <span className="text-center text-xs font-bold uppercase text-muted-foreground group-hover:text-brand">
                    {b.name}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
