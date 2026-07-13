import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ success: false, count: 0 }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const service = createServiceClient();

    if (profile?.role === "admin") {
      const { count, error } = await service
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_role", "user")
        .eq("is_read", false);

      if (error) throw error;
      return Response.json({ success: true, count: count ?? 0 });
    }

    const { data: sessions, error: sessionsError } = await service
      .from("chat_sessions")
      .select("id")
      .eq("user_id", user.id);

    if (sessionsError) throw sessionsError;
    const sessionIds = (sessions ?? []).map((session) => session.id);
    if (sessionIds.length === 0) {
      return Response.json({ success: true, count: 0 });
    }

    const { count, error } = await service
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .in("session_id", sessionIds)
      .eq("sender_role", "admin")
      .eq("is_read", false);

    if (error) throw error;
    return Response.json({ success: true, count: count ?? 0 });
  } catch {
    return Response.json({ success: false, count: 0 }, { status: 500 });
  }
}
