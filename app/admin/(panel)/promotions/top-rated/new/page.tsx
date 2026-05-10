import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { PromotionForm } from "../../_components/promotion-form";
import { fetchSelectorData } from "../../_lib/fetch-selector-data";

export const metadata: Metadata = { title: "Buat Promosi Rating Tertinggi — Admin GeekyTech" };

const BACK_PATH = "/admin/promotions/top-rated";

export default async function TopRatedNewPage() {
  const { products, brands } = await fetchSelectorData();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-6 lg:p-8">
      <Link
        href={BACK_PATH}
        className="admin-text-link inline-flex items-center gap-1.5 text-xs font-medium"
      >
        <ArrowLeft size={13} />
        Kembali ke daftar
      </Link>

      <div>
        <p className="text-swiss-eyebrow">Promosi</p>
        <h1 className="text-[34px] font-semibold uppercase tracking-[-0.02em] text-foreground">
          Buat Promosi Rating Tertinggi
        </h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">
          Template: Produk Rating Tertinggi · tampilkan produk dengan ulasan terbaik
        </p>
      </div>

      <PromotionForm
        type="top_rated"
        backPath={BACK_PATH}
        redirectPath={BACK_PATH}
        products={products}
        brands={brands}
      />
    </div>
  );
}
