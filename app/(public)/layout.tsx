import { createClient } from "@/lib/supabase/server";
import { AnnouncementBarServer } from "@/components/layout/announcement-bar-server";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { BottomNavBar } from "@/components/layout/bottom-nav-bar";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { MaintenancePage } from "@/components/layout/maintenance-page";
import { HomeMainHero } from "@/components/store/home-main-hero";
import { fetchMainHeroBanners } from "@/lib/data/home-storefront";
import { fetchStoreHeaderCartCount, fetchStoreHeaderCategories } from "@/lib/data/store-header-server";

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

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMaintenance, categories, heroBanners, initialCartCount] = await Promise.all([
    getMaintenanceMode(),
    fetchStoreHeaderCategories(),
    fetchMainHeroBanners(),
    fetchStoreHeaderCartCount(),
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
