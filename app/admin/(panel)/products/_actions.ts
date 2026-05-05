"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export type ImageInput = {
  url: string;
  is_primary: boolean;
  alt_text: string;
  sort_order: number;
};

export type VariantInput = {
  id?: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  is_active: boolean;
};

export type ProductInput = {
  name: string;
  slug: string;
  description: string;
  base_price: number;
  sale_price: number | null;
  min_order_qty: number;
  category_id: string | null;
  is_active: boolean;
  is_featured: boolean;
  meta_title: string;
  meta_description: string;
  images: ImageInput[];
  variants: VariantInput[];
  tags: string[];
};

type ActionResult = { error: string } | { id: string };

export async function createProduct(data: ProductInput): Promise<ActionResult> {
  const supabase = await createServiceClient();

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      base_price: data.base_price,
      sale_price: data.sale_price,
      min_order_qty: data.min_order_qty,
      category_id: data.category_id,
      is_active: data.is_active,
      is_featured: data.is_featured,
      meta_title: data.meta_title || null,
      meta_description: data.meta_description || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Slug sudah digunakan produk lain." };
    return { error: error.message };
  }

  const { error: variantsError } = await supabase.from("product_variants").insert(
    data.variants.map((v) => ({
      product_id: product.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      weight: v.weight,
      length: v.length,
      width: v.width,
      height: v.height,
      is_active: v.is_active,
    }))
  );

  if (variantsError) {
    await supabase.from("products").delete().eq("id", product.id);
    if (variantsError.code === "23505") return { error: "SKU varian sudah digunakan produk lain." };
    return { error: `Gagal menyimpan varian: ${variantsError.message}` };
  }

  await Promise.all([
    data.images.length > 0
      ? supabase.from("product_images").insert(
          data.images.map((img, i) => ({
            product_id: product.id,
            url: img.url,
            is_primary: img.is_primary,
            alt_text: img.alt_text || null,
            sort_order: i,
          }))
        )
      : null,
    data.tags.length > 0
      ? supabase.from("product_tags").insert(
          data.tags.map((tag) => ({ product_id: product.id, tag }))
        )
      : null,
  ]);

  revalidatePath("/admin/products");
  return { id: product.id };
}

export async function updateProduct(
  id: string,
  data: ProductInput
): Promise<ActionResult> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("products")
    .update({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      base_price: data.base_price,
      sale_price: data.sale_price,
      min_order_qty: data.min_order_qty,
      category_id: data.category_id,
      is_active: data.is_active,
      is_featured: data.is_featured,
      meta_title: data.meta_title || null,
      meta_description: data.meta_description || null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Slug sudah digunakan produk lain." };
    return { error: error.message };
  }

  // Replace images
  await supabase.from("product_images").delete().eq("product_id", id);
  if (data.images.length > 0) {
    await supabase.from("product_images").insert(
      data.images.map((img, i) => ({
        product_id: id,
        url: img.url,
        is_primary: img.is_primary,
        alt_text: img.alt_text || null,
        sort_order: i,
      }))
    );
  }

  // Variants: get existing IDs, upsert or insert, deactivate removed
  const { data: existingVariants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", id);

  const existingIds = existingVariants?.map((v) => v.id) ?? [];
  const incomingIds = data.variants.filter((v) => v.id).map((v) => v.id!);
  const removedIds = existingIds.filter((eid) => !incomingIds.includes(eid));

  if (removedIds.length > 0) {
    await supabase
      .from("product_variants")
      .update({ is_active: false })
      .in("id", removedIds);
  }

  for (const v of data.variants) {
    if (v.id) {
      const { error: updateVariantError } = await supabase
        .from("product_variants")
        .update({
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          weight: v.weight,
          length: v.length,
          width: v.width,
          height: v.height,
          is_active: v.is_active,
        })
        .eq("id", v.id);
      if (updateVariantError) {
        if (updateVariantError.code === "23505") return { error: "SKU varian sudah digunakan produk lain." };
        return { error: `Gagal memperbarui varian: ${updateVariantError.message}` };
      }
    } else {
      const { error: insertVariantError } = await supabase.from("product_variants").insert({
        product_id: id,
        name: v.name,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        weight: v.weight,
        length: v.length,
        width: v.width,
        height: v.height,
        is_active: v.is_active,
      });
      if (insertVariantError) {
        if (insertVariantError.code === "23505") return { error: "SKU varian sudah digunakan produk lain." };
        return { error: `Gagal menambah varian: ${insertVariantError.message}` };
      }
    }
  }

  // Replace tags
  await supabase.from("product_tags").delete().eq("product_id", id);
  if (data.tags.length > 0) {
    await supabase
      .from("product_tags")
      .insert(data.tags.map((tag) => ({ product_id: id, tag })));
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}/edit`);
  return { id };
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return {};
}

export async function toggleProductStatus(
  id: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return {};
}
