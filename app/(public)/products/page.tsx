import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryStoreProductHub } from "@/components/store/category-store-product-hub";
import {
  fetchActiveCategoriesForProductIndex,
  fetchCategoryBySlugForStore,
  fetchCategoryProductsGroupedByBrand,
} from "@/lib/data/category-store-page";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ category?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const sp = await searchParams;
  const slug = sp.category?.trim();
  if (!slug) {
    return {
      title: "Produk — GeekyTech",
      description: "Telusuri produk GeekyTech menurut kategori, dikelompokkan menurut brand.",
    };
  }
  const cat = await fetchCategoryBySlugForStore(slug);
  if (!cat) {
    return { title: "Kategori tidak ditemukan — GeekyTech" };
  }
  return {
    title: `${cat.name} — GeekyTech`,
    description: `Produk ${cat.name} dikelompokkan menurut brand di GeekyTech.`,
  };
}

export default async function ProductsHubPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const slug = sp.category?.trim();

  if (!slug) {
    const categories = await fetchActiveCategoriesForProductIndex();
    return <CategoryStoreProductHub mode="index" categories={categories} />;
  }

  const category = await fetchCategoryBySlugForStore(slug);
  if (!category) notFound();

  const groups = await fetchCategoryProductsGroupedByBrand(category.id);

  return <CategoryStoreProductHub mode="category" groups={groups} categoryName={category.name} categorySlug={slug} />;
}
