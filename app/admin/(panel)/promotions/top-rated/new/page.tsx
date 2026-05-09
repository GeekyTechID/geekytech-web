import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { PromotionForm } from "../../_components/promotion-form";
import { fetchSelectorData } from "../../_lib/fetch-selector-data";

export const metadata: Metadata = { title: "Buat Promosi Rating Tertinggi — Admin GeekyTech" };

const BACK_PATH = "/admin/promotions/top-rated";

export default async function TopRatedNewPage() {
  const { products, brands, categories } = await fetchSelectorData();

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
        <h1 className="text-2xl font-black uppercase tracking-tight">Buat Promosi Rating Tertinggi</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Template: Produk Rating Tertinggi · tampilkan produk dengan ulasan terbaik
        </p>
      </div>

      <PromotionForm
        type="top_rated"
        backPath={BACK_PATH}
        redirectPath={BACK_PATH}
        products={products}
        brands={brands}
        categories={categories}
      />
    </div>
  );
}
