import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailClient } from "@/components/store/product-detail-client";
import { createClient } from "@/lib/supabase/server";
import {
  fetchOtherBrandProductsGrouped,
  fetchProductDetailBySlug,
  fetchProductReviewsForStore,
  fetchRandomProductPicks,
  fetchRatingHistogram,
} from "@/lib/data/product-detail-page";
import { ProductDetailMoreChoicesSection } from "@/components/store/product-detail-more-choices-section";
import { ProductDetailOtherBrandsSection } from "@/components/store/product-detail-other-brands-section";
import type { ProductDetailPublic } from "@/lib/types/product-detail";

export const dynamic = "force-dynamic";

type PageParams = Promise<{ slug: string }>;

function ProductBreadcrumbs({ product }: { product: ProductDetailPublic }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[14px] text-[#7a7a7a]">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link href="/" className="transition hover:text-[#EA5329]">
            Home
          </Link>
        </li>
        {product.brand ? (
          <>
            <li aria-hidden className="text-[#d4d4d4]">
              /
            </li>
            <li>
              <Link href={`/brands/${encodeURIComponent(product.brand.slug)}`} className="transition hover:text-[#EA5329]">
                {product.brand.name}
              </Link>
            </li>
          </>
        ) : null}
        {product.category ? (
          <>
            <li aria-hidden className="text-[#d4d4d4]">
              /
            </li>
            <li>
              <Link
                href={`/products?category=${encodeURIComponent(product.category.slug)}`}
                className="transition hover:text-[#EA5329]"
              >
                {product.category.name}
              </Link>
            </li>
          </>
        ) : null}
        <li aria-hidden className="text-[#d4d4d4]">
          /
        </li>
        <li className="max-w-[min(100%,28rem)] truncate font-medium text-[#1d1d1f]" aria-current="page">
          {product.name}
        </li>
      </ol>
    </nav>
  );
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductDetailBySlug(slug);
  if (!product) {
    return { title: "Produk tidak ditemukan — GeekyTech" };
  }
  const desc = product.description?.replace(/\s+/g, " ").trim().slice(0, 155);
  return {
    title: `${product.name} — GeekyTech`,
    description: desc || `Beli ${product.name} di GeekyTech.`,
  };
}

export default async function ProductDetailPage({ params }: { params: PageParams }) {
  const { slug } = await params;
  const product = await fetchProductDetailBySlug(slug);
  if (!product) notFound();

  const [reviews, histogram, otherBrandGroups] = await Promise.all([
    fetchProductReviewsForStore(product.id, 40),
    fetchRatingHistogram(product.id),
    fetchOtherBrandProductsGrouped({
      productId: product.id,
      brandId: product.brandId,
      categoryId: product.categoryId,
    }),
  ]);

  const excludeRandomIds: string[] = [];
  for (const g of otherBrandGroups) {
    for (const p of g.products) {
      excludeRandomIds.push(p.productId);
    }
  }

  const moreChoices = await fetchRandomProductPicks({
    currentProductId: product.id,
    excludeProductIds: excludeRandomIds,
    limit: 5,
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let initialInWishlist = false;
  if (user) {
    const { data: w } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();
    initialInWishlist = Boolean(w);
  }

  const siteBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="bg-white">
      <div className="border-b border-[#e0e0e0] py-4">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <ProductBreadcrumbs product={product} />
        </div>
      </div>
      <ProductDetailClient
        product={product}
        reviews={reviews}
        histogram={histogram}
        initialInWishlist={initialInWishlist}
        siteBaseUrl={siteBaseUrl}
      />
      <ProductDetailOtherBrandsSection groups={otherBrandGroups} />
      <ProductDetailMoreChoicesSection products={moreChoices} />
    </div>
  );
}
