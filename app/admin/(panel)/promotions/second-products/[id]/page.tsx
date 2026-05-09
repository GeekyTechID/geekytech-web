import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { PromotionForm } from "../../_components/promotion-form";
import { fetchSelectorData, fetchPromotionWithAssociations } from "../../_lib/fetch-selector-data";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const { promo } = await fetchPromotionWithAssociations(id);
  return { title: `${promo?.title ?? "Promosi"} — Admin GeekyTech` };
}

const BACK_PATH = "/admin/promotions/second-products";

export default async function SecondProductsEditPage({ params }: { params: Params }) {
  const { id } = await params;

  const [{ promo, productIds, brandIds }, { products, brands }] = await Promise.all([
    fetchPromotionWithAssociations(id),
    fetchSelectorData(),
  ]);

  if (!promo || promo.type !== "second_products") notFound();

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href={BACK_PATH}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft size={13} />
          Kembali ke daftar
        </Link>
        <h1 className="text-2xl font-black uppercase tracking-tight">{promo.title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Template: Produk Second Terbaik
        </p>
      </div>

      <PromotionForm
        type="second_products"
        backPath={BACK_PATH}
        redirectPath={BACK_PATH}
        initialData={{
          id,
          title: promo.title,
          subtitle: promo.subtitle,
          is_active: promo.is_active ?? false,
          max_items: promo.max_items ?? 10,
          selection_mode: (promo.selection_mode ?? "manual") as "manual" | "brand",
          config: (promo.config ?? {}) as Record<string, unknown>,
          product_ids: productIds,
          brand_ids: brandIds,
        }}
        products={products}
        brands={brands}
      />
    </div>
  );
}
