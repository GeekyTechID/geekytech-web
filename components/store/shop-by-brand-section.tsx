import Image from "next/image";
import Link from "next/link";

import type { ShopBrand } from "@/lib/data/home-storefront";

type ShopByBrandSectionProps = {
  brands: ShopBrand[];
  showSeeAllLink?: boolean;
};

export function ShopByBrandSection({ brands, showSeeAllLink = true }: ShopByBrandSectionProps) {
  const filteredBrands = brands.filter((b) => b.name.toLowerCase() !== "lainnya");

  return (
    <section className="bg-background py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-black text-foreground md:text-2xl">
          Authorized Brand
        </h2>

        <p className="mt-3 max-w-md text-lg leading-relaxed text-muted-foreground">
          Brand-brand tech terpercaya — semua produk original bergaransi resmi, langsung dari distributor resmi di Indonesia.
        </p>

        {filteredBrands.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">Belum ada merek aktif.</p>
        ) : (
          <div className="mt-10 grid justify-start items-start grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredBrands.map((b) => (
              <Link
                key={b.id}
                href={`/brands/${encodeURIComponent(b.slug)}`}
                className="cursor-pointer group flex items-center justify-center overflow-hidden transition hover:border-brand/40"
              >
                {b.logo_url ? (
                  <div className="relative h-12 w-full sm:h-15 transition group-hover:grayscale-0">
                    <Image src={b.logo_url} alt={b.name} fill className="object-contain" sizes="(min-width: 1024px) 220px, (min-width: 768px) 180px, (min-width: 640px) 160px, calc(50vw - 2rem)" />
                  </div>
                ) : (
                  <span className="text-center text-xs font-bold uppercase text-muted-foreground group-hover:text-brand">
                    {b.name}
                  </span>
                )}
              </Link>
            ))}
            {showSeeAllLink ? (
              <Link
                href="/brands"
                className="flex h-12 items-center justify-center text-sm font-semibold text-brand transition hover:text-[#d44820] sm:h-15"
              >
                Lihat Semua
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
