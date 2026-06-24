import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AdminChatInbox } from "@/components/admin/admin-chat-inbox";
import type { ChatSession } from "@/types/chat";

export const metadata: Metadata = { title: "Chat Inbox" };

async function fetchAllSessions(): Promise<ChatSession[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("chat_sessions")
    .select("*, profile:profiles!chat_sessions_user_id_fkey(full_name, avatar_url)")
    .order("updated_at", { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as ChatSession[];
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
    <div className="w-full">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">Admin</p>
      <h1 className="mb-6 mt-2 text-2xl font-bold sm:text-3xl">Chat Inbox</h1>
      <AdminChatInbox initialSessions={sessions} />
    </div>
  );
}
