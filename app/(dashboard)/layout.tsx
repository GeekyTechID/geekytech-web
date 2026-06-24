export const dynamic = "force-dynamic";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { InitAuthStore } from "@/components/providers/init-auth-store";
import { ChatWidget } from "@/components/chat/chat-widget";
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

  const cookieStore = await cookies();
  const sidebarDefaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const [unreadNotifications, profile] = await Promise.all([
    user ? getUnreadNotificationsCount(user.id) : Promise.resolve(0),
    user ? fetchUserProfile(user.id) : Promise.resolve(null),
  ]);

  return (
    <div className="flex w-full flex-col">
      <InitAuthStore user={user} profile={profile} />
      <DashboardShell
        unreadNotifications={unreadNotifications}
        sidebarDefaultOpen={sidebarDefaultOpen}
      >
        {children}
      </DashboardShell>
      <div data-no-print>
        <ChatWidget />
      </div>
    </div>
  );
}
