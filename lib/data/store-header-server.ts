import { createClient } from "@/lib/supabase/server";

export type StoreHeaderCategoryRow = { id: string; name: string; slug: string };

export async function fetchStoreHeaderCategories(): Promise<StoreHeaderCategoryRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function fetchStoreHeaderCartCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle();
    if (!cart) return 0;

    const { data: items } = await supabase.from("cart_items").select("quantity").eq("cart_id", cart.id);
    if (!items) return 0;

    return items.reduce((sum, item) => sum + item.quantity, 0);
  } catch {
    return 0;
  }
}
