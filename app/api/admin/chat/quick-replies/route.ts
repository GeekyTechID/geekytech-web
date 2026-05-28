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

    const { data } = await supabase
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
    const { data, error } = await svc
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return Response.json({ success: false, error: "id tidak valid" }, { status: 400 });
    }

    const svc = createServiceClient();
    const { data: deleted, error } = await svc
      .from("chat_quick_replies")
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error || !deleted) {
      return Response.json({ success: false, error: "Tidak ditemukan" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
