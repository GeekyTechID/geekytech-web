import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

const ReactSchema = z.object({
  emoji: z.enum(ALLOWED_EMOJIS),
});

// PATCH: toggle emoji reaction (atomic via DB function)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = ReactSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ success: false, error: "Invalid emoji" }, { status: 400 });
    }

    // Verify message exists and user has access (RLS check)
    const { data: message } = await supabase
      .from("chat_messages")
      .select("id")
      .eq("id", id)
      .single();

    if (!message) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    const svc = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (svc as any).rpc("toggle_chat_reaction", {
      p_message_id: id,
      p_user_id: user.id,
      p_emoji: parsed.data.emoji,
    });

    if (error) {
      return Response.json({ success: false, error: "Gagal update reaksi" }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
