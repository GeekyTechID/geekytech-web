import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { FlashSaleCountdown } from "@/components/store/flash-sale-countdown";
import { HomeProductTile } from "@/components/store/home-product-tile";
import { fetchFlashSalePageData } from "@/lib/data/promo-pages";

export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchFlashSalePageData(id);
  if (!data) return { title: "Flash Sale" };
  return {
    title: data.name,
    description: data.subtitle ?? `Produk flash sale ${data.name} — harga spesial terbatas.`,
  };
}

export default async function FlashSalePage({ params }: Props) {
  const { id } = await params;
  const data = await fetchFlashSalePageData(id);
  if (!data) notFound();

  const isExpired = data.endsAt ? new Date(data.endsAt) < new Date() : false;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-3">
        <h1 className="text-lg font-black leading-snug text-foreground sm:text-xl md:text-2xl">
          {data.name}
        </h1>
        {data.subtitle ? (
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {data.subtitle}
          </p>
        ) : null}
        {data.endsAt ? (
          isExpired ? (
            <p className="text-sm text-muted-foreground">Flash sale telah berakhir.</p>
          ) : (
            <FlashSaleCountdown endsAt={data.endsAt} />
          )
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
