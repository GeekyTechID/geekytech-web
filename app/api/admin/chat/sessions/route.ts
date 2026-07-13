import { createClient, createServiceClient } from "@/lib/supabase/server";
import { withSessionUnreadCounts } from "@/lib/chat/with-session-unread-counts";
import type { ChatSession } from "@/types/chat";

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!(await verifyAdmin(supabase, user.id))) {
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // 'open' | 'resolved' | null = all

    const svc = createServiceClient();
    let query = svc
      .from("chat_sessions")
      .select("*, profile:profiles!chat_sessions_user_id_fkey(full_name, avatar_url)")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (status === "open" || status === "resolved") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    const sessions = await withSessionUnreadCounts(
      (data ?? []) as unknown as ChatSession[],
      "user",
    );
    return Response.json({ success: true, data: sessions });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
