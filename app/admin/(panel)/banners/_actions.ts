"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export type BannerFormData = {
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export async function createBanner(data: BannerFormData): Promise<{ error?: string; id?: string }> {
  if (!data.image_url.trim()) return { error: "Gambar banner wajib diisi." };

  const supabase = await createServiceClient();
  const { data: banner, error } = await supabase
    .from("banners")
    .insert({
      title: data.title?.trim() || null,
      subtitle: data.subtitle?.trim() || null,
      image_url: data.image_url.trim(),
      link_url: data.link_url?.trim() || null,
      sort_order: data.sort_order,
      is_active: data.is_active,
      starts_at: data.starts_at || null,
      ends_at: data.ends_at || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { id: banner.id };
}

export async function updateBanner(
  id: string,
  data: BannerFormData
): Promise<{ error?: string }> {
  if (!data.image_url.trim()) return { error: "Gambar banner wajib diisi." };

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("banners")
    .update({
      title: data.title?.trim() || null,
      subtitle: data.subtitle?.trim() || null,
      image_url: data.image_url.trim(),
      link_url: data.link_url?.trim() || null,
      sort_order: data.sort_order,
      is_active: data.is_active,
      starts_at: data.starts_at || null,
      ends_at: data.ends_at || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return {};
}

export async function toggleBannerActive(
  id: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("banners")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return {};
}

export async function deleteBanner(id: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("banners")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return {};
}
