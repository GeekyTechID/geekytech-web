import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";

// GET: get session detail (user must own it or be admin)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { data } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (!data)
      return Response.json({ success: false, error: "Not found" }, { status: 404 });

    return Response.json({ success: true, data });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

// PATCH: close session (admin only)
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const svc = createServiceClient();

    const { data: session } = await svc
      .from("chat_sessions")
      .select("user_id, status")
      .eq("id", id)
      .single();

    if (!session)
      return Response.json({ success: false, error: "Not found" }, { status: 404 });
    if (session.status === "resolved") {
      return Response.json({ success: false, error: "Sesi sudah ditutup" }, { status: 409 });
    }

    await svc
      .from("chat_sessions")
      .update({ status: "resolved", closed_at: new Date().toISOString() })
      .eq("id", id);

    // System message
    await svc.from("chat_messages").insert({
      session_id: id,
      sender_id: user.id,
      sender_role: "system",
      content: "Sesi chat telah ditutup oleh admin.",
      message_type: "system",
    });

    // Notify user
    await createNotification({
      userId: session.user_id,
      title: "Sesi chat ditutup",
      body: "Admin telah menutup sesi chat kamu. Kamu bisa membuka sesi baru kapan saja.",
      type: "chat_session_closed",
      data: { session_id: id },
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
