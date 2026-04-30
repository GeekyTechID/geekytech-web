import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../../_components/product-form";
import type { ImageItem } from "../../_components/image-uploader";

export const metadata: Metadata = { title: "Edit Produk — Admin GeekyTech" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select(
        `id, name, slug, description, base_price, sale_price, min_order_qty,
         category_id, is_active, is_featured, meta_title, meta_description, deleted_at,
         product_images(url, is_primary, alt_text, sort_order),
         product_variants(id, name, sku, price, stock, weight, length, width, height, is_active),
         product_tags(tag)`
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single(),

    supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  if (!product) notFound();

  const defaultImages: ImageItem[] = [...(product.product_images ?? [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img) => ({
      url: img.url,
      is_primary: img.is_primary,
      alt_text: img.alt_text ?? "",
    }));

  const defaultVariants = [...(product.product_variants ?? [])]
    .filter((v) => v.is_active)
    .map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      weight: v.weight,
      length: v.length ?? 0,
      width: v.width ?? 0,
      height: v.height ?? 0,
      is_active: v.is_active,
    }));

  const defaultTags = (product.product_tags ?? []).map((t) => t.tag);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link
          href="/admin/products"
          className="hover:text-foreground transition-colors font-medium"
        >
          Produk
        </Link>
        <ChevronRight size={12} />
        <span className="font-bold text-foreground truncate max-w-xs">
          {product.name}
        </span>
      </nav>

      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Edit Produk</h1>
        <p className="text-sm text-muted-foreground mt-0.5 font-mono">/{product.slug}</p>
      </div>

      <ProductForm
        categories={categories ?? []}
        defaultProduct={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          base_price: product.base_price,
          sale_price: product.sale_price,
          min_order_qty: product.min_order_qty,
          category_id: product.category_id,
          is_active: product.is_active,
          is_featured: product.is_featured,
          meta_title: product.meta_title,
          meta_description: product.meta_description,
        }}
        defaultImages={defaultImages}
        defaultVariants={defaultVariants}
        defaultTags={defaultTags}
      />
    </div>
  );
}
