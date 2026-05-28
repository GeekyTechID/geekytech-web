import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const QuickReplySchema = z.object({
  shortcut: z.string().min(1).max(50),
  content: z.string().min(1).max(1000),
});

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!(await verifyAdmin(supabase, user.id))) {
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("chat_quick_replies")
      .select("*")
      .order("shortcut");

    return Response.json({ success: true, data: data ?? [] });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!(await verifyAdmin(supabase, user.id))) {
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = QuickReplySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const svc = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (svc as any)
      .from("chat_quick_replies")
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      return Response.json({ success: false, error: "Gagal menyimpan" }, { status: 500 });
    }

    return Response.json({ success: true, data }, { status: 201 });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!(await verifyAdmin(supabase, user.id))) {
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return Response.json({ success: false, error: "id required" }, { status: 400 });

    const svc = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (svc as any).from("chat_quick_replies").delete().eq("id", id);

    if (error) {
      return Response.json({ success: false, error: "Gagal menghapus" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
