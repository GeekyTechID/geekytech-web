import { createClient, createServiceClient } from "@/lib/supabase/server";

// PATCH: mark all messages from the other side as read
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const myRole = profile?.role === "admin" ? "admin" : "user";
    const otherRole = myRole === "admin" ? "user" : "admin";

    // Verify session access: user must own it, admin can access all
    if (myRole === "user") {
      const { data: session } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!session) {
        return Response.json({ success: false, error: "Not found" }, { status: 404 });
      }
    }

    const svc = createServiceClient();
    await svc
      .from("chat_messages")
      .update({ is_read: true })
      .eq("session_id", id)
      .eq("sender_role", otherRole)
      .eq("is_read", false);

    return Response.json({ success: true });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
