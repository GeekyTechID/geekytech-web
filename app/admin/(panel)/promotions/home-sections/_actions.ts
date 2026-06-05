"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export type HomeSectionKey = "main_banner" | "flash_sale" | "second_products" | "featured_products";

export type HomeSection = {
  key: HomeSectionKey;
  selected_id: string | null;
  is_active: boolean;
  order: number;
};

export async function saveHomeSections(sections: HomeSection[]): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "home_sections", value: sections as unknown as Json }, { onConflict: "key" });

  if (error) return { error: error.message };
  revalidatePath("/admin/promotions/home-sections");
  revalidatePath("/");
  return {};
}
