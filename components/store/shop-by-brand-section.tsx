import Image from "next/image";
import Link from "next/link";

import type { ShopBrand } from "@/lib/data/home-storefront";

type ShopByBrandSectionProps = {
  brands: ShopBrand[];
};

export function ShopByBrandSection({ brands }: ShopByBrandSectionProps) {
  return (
    <section className="bg-white py-12 dark:border-border dark:bg-background">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-black text-black md:text-2xl dark:text-foreground">
          Belanja Berdasarkan Brand
        </h2>

        <p className="mt-3 max-w-md text-lg leading-relaxed text-black dark:text-muted-foreground">
          Temukan berbagai koleksi produk berkualitas dari merek-merek pilihan yang sudah teruji 
          keunggulannya di seluruh dunia. Jelajahi katalog lengkap kami sekarang untuk mendapatkan barang original langsung dari brand kesayangan Anda.
        </p>

        {brands.filter((b) => b.name.toLowerCase() !== "lainnya").length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">Belum ada merek aktif.</p>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {brands.filter((b) => b.name.toLowerCase() !== "lainnya").map((b) => (
              <Link
                key={b.id}
                href={`/brands/${encodeURIComponent(b.slug)}`}
                className="cursor-pointer group flex items-center justify-center px-4 transition hover:border-brand/40 dark:border-border dark:bg-muted"
              >
                {b.logo_url ? (
                  <div className="relative h-15 w-90 transition group-hover:grayscale-0">
                    <Image src={b.logo_url} alt={b.name} fill className="object-contain" sizes="100px" />
                  </div>
                ) : (
                  <span className="text-center text-xs font-bold uppercase tracking-widest text-neutral-600 group-hover:text-brand dark:text-muted-foreground">
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
