import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";

const CreateSchema = z.object({
  subject: z.string().min(3).max(200),
});

// GET: get user's active (open) session
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { data } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return Response.json({ success: true, data });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

// POST: create new session (only if no open session exists)
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    // Check no open session exists
    const { data: existing } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "open")
      .maybeSingle();

    if (existing) {
      return Response.json({ success: false, error: "Sudah ada sesi aktif" }, { status: 409 });
    }

    const svc = createServiceClient();
    const { data: session, error } = await svc
      .from("chat_sessions")
      .insert({ user_id: user.id, subject: parsed.data.subject })
      .select()
      .single();

    if (error || !session) {
      return Response.json({ success: false, error: "Gagal membuat sesi" }, { status: 500 });
    }

    // System message: session started
    await svc.from("chat_messages").insert({
      session_id: session.id,
      sender_id: user.id,
      sender_role: "system",
      content: "Sesi chat dimulai.",
      message_type: "system",
    });

    // Notify admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    await createAdminNotification({
      title: "Chat baru",
      body: `${profile?.full_name ?? "Pelanggan"} membuka sesi: ${parsed.data.subject}`,
      type: "chat_new_session",
      data: { session_id: session.id },
    });

    return Response.json({ success: true, data: session }, { status: 201 });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
