import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AdminChatInbox } from "@/components/admin/admin-chat-inbox";
import type { ChatSession } from "@/types/chat";
import { withSessionUnreadCounts } from "@/lib/chat/with-session-unread-counts";

export const metadata: Metadata = { title: "Chat Inbox" };

async function fetchAllSessions(): Promise<ChatSession[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("chat_sessions")
    .select("*, profile:profiles!chat_sessions_user_id_fkey(full_name, avatar_url)")
    .order("updated_at", { ascending: false })
    .limit(100);
  return withSessionUnreadCounts((data ?? []) as unknown as ChatSession[], "user");
}

export default async function AdminChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/admin/login");

  const sessions = await fetchAllSessions();

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="text-swiss-eyebrow">Dukungan</p>
        <h1 className="text-[34px] font-semibold uppercase text-foreground">Chat Inbox</h1>
      </div>
      <AdminChatInbox initialSessions={sessions} />
    </div>
  );
}
