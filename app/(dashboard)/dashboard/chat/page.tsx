import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ChatSession } from "@/types/chat";
import { DashboardChatShell } from "@/components/dashboard/chat-dashboard-shell";
import { withSessionUnreadCounts } from "@/lib/chat/with-session-unread-counts";

export const metadata: Metadata = {
  title: "Chat CS",
  description: "Riwayat dan percakapan dengan customer service GeekyTech.",
};

async function fetchUserSessions(userId: string): Promise<ChatSession[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return withSessionUnreadCounts((data ?? []) as ChatSession[], "admin");
}

export default async function DashboardChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/chat");

  const sessions = await fetchUserSessions(user.id);

  return <DashboardChatShell userId={user.id} initialSessions={sessions} />;
}
