export const dynamic = "force-dynamic";

import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { HomeMainHero } from "@/components/store/home-main-hero";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { InitAuthStore } from "@/components/providers/init-auth-store";
import { ChatWidget } from "@/components/chat/chat-widget";
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
      <div
        data-no-print
        id="dashboard-site-header"
        className="sticky top-0 z-50 w-full shrink-0 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 dark:bg-background/95"
      >
        <StoreHeader
          categories={categories}
          initialCartCount={initialCartCount}
          sticky={false}
        />
      </div>
      <DashboardShell unreadNotifications={unreadNotifications}>{children}</DashboardShell>

      <div data-no-print>
        <ChatWidget />
      </div>
      <div data-no-print className="mt-10 md:mt-16">
        {heroBanners.length > 0 ? <HomeMainHero banners={heroBanners} hideNav /> : null}
      </div>

      <div data-no-print>
        <Suspense fallback={<div className="min-h-[120px] w-full bg-[#121212]" aria-hidden />}>
          <StoreFooter />
        </Suspense>
      </div>
    </div>
  );
}
