import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { HomeProductTile } from "@/components/store/home-product-tile";
import { fetchPromotionPageData } from "@/lib/data/promo-pages";

export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchPromotionPageData(id);
  if (!data) return { title: "Promosi" };
  return {
    title: data.title,
    description: data.subtitle ?? `Lihat semua produk dalam promosi ${data.title}.`,
  };
}

export default async function PromoPage({ params }: Props) {
  const { id } = await params;
  const data = await fetchPromotionPageData(id);
  if (!data) notFound();

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-24">
      <div className="mb-8 space-y-3">
        <h1 className="text-lg font-black leading-snug text-foreground sm:text-xl md:text-2xl">
          {data.title}
        </h1>
        {data.subtitle ? (
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {data.subtitle}
          </p>
        ) : null}
      </div>

      {data.products.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada produk.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {data.products.map((p) => (
            <HomeProductTile key={`${p.productId}-${p.variantId}`} product={p} layout="fluidRow" />
          ))}
        </div>
      )}
    </main>
  );
}
