"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export type MainBannerData = {
  image_url: string;
  link_url: string | null;
  is_active: boolean;
};

const SETTINGS_KEY = "main_banner_id";

export async function getMainBanner(): Promise<{
  id: string;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
} | null> {
  const supabase = await createServiceClient();

  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();

  const bannerId = setting?.value as string | null | undefined;
  if (!bannerId) return null;

  const { data: banner } = await supabase
    .from("banners")
    .select("id, image_url, link_url, is_active")
    .eq("id", bannerId)
    .maybeSingle();

  return banner ?? null;
}

export async function upsertMainBanner(
  existingId: string | null,
  data: MainBannerData,
): Promise<{ error?: string }> {
  if (!data.image_url.trim()) return { error: "Gambar banner wajib diisi." };

  const supabase = await createServiceClient();
  let bannerId = existingId;

  if (existingId) {
    const { error } = await supabase
      .from("banners")
      .update({
        image_url: data.image_url.trim(),
        link_url: data.link_url?.trim() || null,
        is_active: data.is_active,
      })
      .eq("id", existingId);
    if (error) return { error: error.message };
  } else {
    const { data: created, error } = await supabase
      .from("banners")
      .insert({
        image_url: data.image_url.trim(),
        link_url: data.link_url?.trim() || null,
        is_active: data.is_active,
        sort_order: 0,
        starts_at: null,
        ends_at: null,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    bannerId = created.id;
  }

  const { error: settingError } = await supabase
    .from("settings")
    .upsert({ key: SETTINGS_KEY, value: bannerId }, { onConflict: "key" });
  if (settingError) return { error: settingError.message };

  revalidatePath("/admin/promotions/main-banner");
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return {};
}
