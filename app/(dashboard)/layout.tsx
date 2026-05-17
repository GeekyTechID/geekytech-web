import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { HomeMainHero } from "@/components/store/home-main-hero";
import { StoreFooter } from "@/components/store/store-footer";
import { InitAuthStore } from "@/components/providers/init-auth-store";
import { fetchMainHeroBanners } from "@/lib/data/home-storefront";
import { fetchStoreHeaderCartCount, fetchStoreHeaderCategories } from "@/lib/data/store-header-server";
import { fetchUserProfile } from "@/lib/data/dashboard-user";

async function getUnreadNotificationsCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [categories, initialCartCount, heroBanners, unreadNotifications, profile] = await Promise.all([
    fetchStoreHeaderCategories(),
    fetchStoreHeaderCartCount(),
    fetchMainHeroBanners(),
    user ? getUnreadNotificationsCount(user.id) : Promise.resolve(0),
    user ? fetchUserProfile(user.id) : Promise.resolve(null),
  ]);

  return (
    <div className="flex w-full flex-col">
      <InitAuthStore user={user} profile={profile} />
      <DashboardShell
        categories={categories}
        initialCartCount={initialCartCount}
        unreadNotifications={unreadNotifications}
      >
        {children}
      </DashboardShell>

      <div className="mt-10 md:mt-16">
        {heroBanners.length > 0 ? <HomeMainHero banners={heroBanners} hideNav /> : null}
      </div>
      
      <Suspense fallback={<div className="min-h-[120px] w-full bg-[#121212]" aria-hidden />}>
        <StoreFooter />
      </Suspense>
    </div>
  );
}
