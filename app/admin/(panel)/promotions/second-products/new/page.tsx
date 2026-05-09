import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { PromotionForm } from "../../_components/promotion-form";
import { fetchSelectorData } from "../../_lib/fetch-selector-data";

export const metadata: Metadata = { title: "Buat Promosi Produk Second — Admin GeekyTech" };

const BACK_PATH = "/admin/promotions/second-products";

export default async function SecondProductsNewPage() {
  const { products, brands } = await fetchSelectorData();

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
        <h1 className="text-2xl font-black uppercase tracking-tight">Buat Promosi Produk Second</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Template: Produk Second Terbaik · hanya produk kondisi second yang dapat dipilih
        </p>
      </div>

      <PromotionForm
        type="second_products"
        backPath={BACK_PATH}
        redirectPath={BACK_PATH}
        products={products}
        brands={brands}
      />
    </div>
  );
}
