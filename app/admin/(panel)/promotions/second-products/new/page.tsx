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
    <div className="mx-auto w-full space-y-8 p-6 lg:p-8">
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
          Buat Promosi Produk Second
        </h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">
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
