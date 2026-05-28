import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";

const SendSchema = z.object({
  content: z.string().max(2000).optional(),
  message_type: z.enum(["text", "image", "file"]).default("text"),
  attachment: z
    .object({
      file_url: z.string().url(),
      file_name: z.string(),
      file_type: z.string(),
      file_size: z.number(),
    })
    .optional(),
});

// GET: message history with attachments
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

    const { data: messages } = await supabase
      .from("chat_messages")
      .select("*, attachments:chat_attachments(*)")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    return Response.json({ success: true, data: messages ?? [] });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

// POST: send message
export async function POST(
  req: Request,
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

    const body = await req.json();
    const parsed = SendSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }
    if (!parsed.data.content && !parsed.data.attachment) {
      return Response.json(
        { success: false, error: "Pesan tidak boleh kosong" },
        { status: 400 },
      );
    }

    // Verify session access and status
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("user_id, status")
      .eq("id", id)
      .single();

    if (!session)
      return Response.json(
        { success: false, error: "Sesi tidak ditemukan" },
        { status: 404 },
      );
    if (session.status === "resolved") {
      return Response.json({ success: false, error: "Sesi sudah ditutup" }, { status: 409 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const senderRole = profile?.role === "admin" ? "admin" : "user";

    const svc = createServiceClient();
    const { data: message, error } = await svc
      .from("chat_messages")
      .insert({
        session_id: id,
        sender_id: user.id,
        sender_role: senderRole,
        content: parsed.data.content ?? null,
        message_type: parsed.data.message_type,
      })
      .select()
      .single();

    if (error || !message) {
      return Response.json({ success: false, error: "Gagal mengirim pesan" }, { status: 500 });
    }

    // Insert attachment if present
    if (parsed.data.attachment) {
      await svc.from("chat_attachments").insert({
        message_id: message.id,
        ...parsed.data.attachment,
      });
    }

    // Notify the other party
    if (senderRole === "user") {
      await createAdminNotification({
        title: "Pesan chat baru",
        body: `${profile?.full_name ?? "Pelanggan"}: ${parsed.data.content ?? "[file]"}`,
        type: "chat_message_user",
        data: { session_id: id },
      });
    } else {
      await createNotification({
        userId: session.user_id,
        title: "Balasan dari Admin",
        body: parsed.data.content ?? "[file]",
        type: "chat_message",
        data: { session_id: id },
      });
    }

    return Response.json({ success: true, data: message }, { status: 201 });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
