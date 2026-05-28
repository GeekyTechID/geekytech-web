import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

const ReactSchema = z.object({
  emoji: z.enum(ALLOWED_EMOJIS),
});

// PATCH: toggle emoji reaction
export async function PATCH(
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
    const parsed = ReactSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ success: false, error: "Invalid emoji" }, { status: 400 });
    }

    const { emoji } = parsed.data;
    const { data: message } = await supabase
      .from("chat_messages")
      .select("reactions")
      .eq("id", id)
      .single();

    if (!message)
      return Response.json({ success: false, error: "Not found" }, { status: 404 });

    const reactions = (message.reactions as Record<string, string[]>) ?? {};
    const current = reactions[emoji] ?? [];
    const hasReacted = current.includes(user.id);

    const updated = {
      ...reactions,
      [emoji]: hasReacted
        ? current.filter((uid) => uid !== user.id)
        : [...current, user.id],
    };
    if (updated[emoji].length === 0) delete updated[emoji];

    const svc = createServiceClient();
    await svc.from("chat_messages").update({ reactions: updated }).eq("id", id);

    return Response.json({ success: true, data: updated });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
