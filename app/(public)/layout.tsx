import { createClient } from "@/lib/supabase/server";
import { AnnouncementBarServer } from "@/components/layout/announcement-bar-server";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { BottomNavBar } from "@/components/layout/bottom-nav-bar";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { MaintenancePage } from "@/components/layout/maintenance-page";
import { HomeMainHero } from "@/components/store/home-main-hero";
import { fetchMainHeroBanners } from "@/lib/data/home-storefront";

async function getMaintenanceMode(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();
    return data?.value === true || data?.value === "true";
  } catch {
    return false;
  }
}

async function getNavCategories() {
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

async function getCartCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data: cart } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!cart) return 0;

    const { data: items } = await supabase
      .from("cart_items")
      .select("quantity")
      .eq("cart_id", cart.id);
    if (!items) return 0;

    return items.reduce((sum, item) => sum + item.quantity, 0);
  } catch {
    return 0;
  }
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMaintenance, categories, heroBanners, initialCartCount] = await Promise.all([
    getMaintenanceMode(),
    getNavCategories(),
    fetchMainHeroBanners(),
    getCartCount(),
  ]);

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-background">
      <AnnouncementBarServer />
      <StoreHeader categories={categories} initialCartCount={initialCartCount} />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      {heroBanners.length > 0 && <HomeMainHero banners={heroBanners} hideNav />}
      <StoreFooter />
      <BottomNavBar />
      <WhatsAppButton />
    </div>
  );
}
