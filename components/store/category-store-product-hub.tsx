import Image from "next/image";
import Link from "next/link";

import { HomeProductTile } from "@/components/store/home-product-tile";
import type { CategoryBrandShelfGroup, CategoryStorePublicCategory } from "@/lib/data/category-store-page";
import { cn } from "@/lib/utils";

type HubProps =
  | { mode: "index"; categories: CategoryStorePublicCategory[] }
  | { mode: "category"; groups: CategoryBrandShelfGroup[]; categoryName: string; categorySlug: string };

function BreadcrumbNav({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="border-b border-[#e0e0e0] bg-white py-3">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <ol className="flex items-center gap-2 text-[13px]">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-[#c8c8cc]" aria-hidden>/</span>}
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-[#7a7a7a] transition-colors hover:text-[#1d1d1f]"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-[#1d1d1f]" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

function CategoryIndexView({ categories }: { categories: CategoryStorePublicCategory[] }) {
  return (
    <div className="bg-[#f5f5f7] text-[#1d1d1f]">
      <BreadcrumbNav items={[{ label: "Home", href: "/" }, { label: "Produk" }]} />
      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          {categories.length === 0 ? (
            <p className="text-center text-[17px] text-[#7a7a7a]">Belum ada kategori aktif.</p>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/products?category=${encodeURIComponent(c.slug)}`}
                    className="group flex min-h-[168px] flex-col justify-between p-8 transition active:scale-[0.98] md:min-h-[200px]"
                  >
                    <h2 className="text-[28px] font-semibold leading-[1.14] tracking-[-0.01em] transition group-hover:text-[#EA5329]">
                      {c.name}
                    </h2>
                    <span className="text-[17px] font-normal text-[#EA5329]">Telusuri</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function CategoryByBrandView({
  groups,
  categoryName,
  categorySlug,
}: {
  groups: CategoryBrandShelfGroup[];
  categoryName: string;
  categorySlug: string;
}) {
  return (
    <div className="text-[#1d1d1f]">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "Produk", href: "/products" },
          { label: categoryName },
        ]}
      />
      {groups.length === 0 ? (
        <section className="bg-white py-20 text-center">
          <p className="text-[17px] text-[#7a7a7a]">Belum ada produk aktif di kategori ini.</p>
          <Link
            href="/products"
            className="mt-6 inline-block text-[17px] font-medium text-[#EA5329] underline-offset-4 hover:underline"
          >
            Kembali ke daftar kategori
          </Link>
        </section>
      ) : (
        groups.map((g, i) => {
          const isParchment = i % 2 === 1;
          return (
            <section
              key={g.brandId}
              id={`brand-${g.brandId}`}
              className={cn(
                "scroll-mt-28 py-10",
                isParchment ? "bg-[#f5f5f7]" : "bg-white",
              )}
            >
              <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
                <header className="flex flex-col gap-6 pb-10 md:flex-row md:items-end md:justify-between">
                  <div className="flex min-w-0 items-center gap-4 md:gap-5">
                    {g.logoUrl ? (
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#e0e0e0] bg-white md:h-16 md:w-16">
                        <Image
                          src={g.logoUrl}
                          alt={`Logo ${g.brandName}`}
                          fill
                          className="object-contain p-1.5"
                          sizes="64px"
                        />
                      </div>
                    ) : (
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-xs font-bold uppercase tracking-widest md:h-16 md:w-16"
                        aria-hidden
                      >
                        {g.brandName.slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="mt-1 text-[clamp(1.75rem,4vw,2.125rem)] font-semibold leading-tight tracking-[-0.02em]">
                        {g.brandName}
                      </h2>
                    </div>
                  </div>

                  {g.brandSlug ? (
                    <Link
                      href={`/brands/${encodeURIComponent(g.brandSlug)}`}
                      className="shrink-0 text-[17px] font-medium tracking-[-0.022em] text-[#EA5329] transition hover:text-[#d44820]"
                    >
                      Lihat halaman {g.brandName}
                    </Link>
                  ) : null}
                </header>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-5">
                  {g.products.map((p) => (
                    <div key={`${p.productId}-${p.variantId}`} className="min-w-0">
                      <HomeProductTile
                        product={p}
                        layout="promoRow"
                        className="h-full overflow-hidden"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

export function CategoryStoreProductHub(props: HubProps) {
  if (props.mode === "index") {
    return <CategoryIndexView categories={props.categories} />;
  }
  return (
    <CategoryByBrandView
      groups={props.groups}
      categoryName={props.categoryName}
      categorySlug={props.categorySlug}
    />
  );
}
