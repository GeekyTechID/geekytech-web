import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CartLineView } from "@/components/store/cart-line-card";
import { computeVariantUnitPrice } from "@/lib/utils/product-detail-pricing";

function firstRel<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

type ImgRow = { url: string; is_primary: boolean | null; sort_order: number | null; alt_text: string | null };

type CartQueryRow = {
  id: string;
  quantity: number;
  product_variants: {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    reserved: number | null;
    weight: number;
    length: number;
    height: number;
    width: number;
    products: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      base_price: number;
      sale_price: number | null;
      average_rating: number | null;
      review_count: number | null;
      total_sold: number | null;
      category_id: string | null;
      categories: { name: string } | { name: string }[] | null;
      product_images: ImgRow[] | null;
    } | null;
  } | null;
};

function sortImages(images: ImgRow[] | null | undefined): { url: string; alt: string | null }[] {
  if (!images?.length) return [];
  return [...images]
    .sort((a, b) => {
      const pa = a.is_primary ? 1 : 0;
      const pb = b.is_primary ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    })
    .map((i) => ({ url: i.url, alt: i.alt_text }));
}

function excerpt(text: string | null | undefined): string {
  if (!text) return "";
  const plain = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > 180 ? `${plain.slice(0, 177)}…` : plain;
}

export type UserCartWithLines = {
  cartId: string;
  lines: CartLineView[];
  excludedProductIds: string[];
  excludedCategoryIds: string[];
};

/**
 * Ambil keranjang + baris untuk halaman cart/checkout (user harus sudah login).
 */
export async function fetchUserCartWithLines(userId: string): Promise<UserCartWithLines | null> {
  const supabase = await createClient();
  const { data: cart } = await supabase.from("carts").select("id").eq("user_id", userId).maybeSingle();
  if (!cart) return null;

  const { data: rows } = await supabase
    .from("cart_items")
    .select(
      `id, quantity,
      product_variants(
        id, name, sku, price, stock, reserved, weight, length, height, width,
        products(
          id, name, slug, description, base_price, sale_price, average_rating, review_count, total_sold, category_id,
          categories:category_id(name),
          product_images(url, is_primary, sort_order, alt_text)
        )
      )`,
    )
    .eq("cart_id", cart.id);

  const items = (rows ?? []) as unknown as CartQueryRow[];
  const lines: CartLineView[] = [];
  const excludedProductIds: string[] = [];
  const excludedCategoryIds: string[] = [];

  for (const r of items) {
    const v = r.product_variants;
    const p = v?.products;
    if (!v || !p) continue;
    const cat = firstRel(p.categories);
    if (p.category_id) excludedCategoryIds.push(p.category_id);
    excludedProductIds.push(p.id);

    const basePrice = Number(p.base_price);
    const salePrice = p.sale_price != null ? Number(p.sale_price) : null;
    const { listPrice, unitPrice, discountPercent } = computeVariantUnitPrice({
      basePrice,
      salePrice,
      variantPrice: Number(v.price),
    });

    const maxQty = Math.max(1, v.stock - (v.reserved ?? 0));

    lines.push({
      lineId: r.id,
      qty: r.quantity,
      maxQty,
      variantId: v.id,
      variantName: v.name,
      productName: p.name,
      slug: p.slug,
      categoryLabel: cat?.name ?? "Produk",
      descriptionExcerpt: excerpt(p.description),
      rating: Number(p.average_rating ?? 0),
      reviewCount: p.review_count ?? 0,
      soldCount: p.total_sold ?? 0,
      listPrice,
      unitPrice,
      discountPercent,
      images: sortImages(p.product_images),
      sku: v.sku,
      weightGrams: Math.max(1, Math.round(Number(v.weight) || 1)),
    });
  }

  return { cartId: cart.id, lines, excludedProductIds, excludedCategoryIds };
}
