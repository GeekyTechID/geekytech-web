import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ALLOWED_CHAT_FILE_TYPES, CHAT_SIZE_LIMITS } from "@/types/chat";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return Response.json({ success: false, error: "No file provided" }, { status: 400 });

    // Validate MIME type
    if (!ALLOWED_CHAT_FILE_TYPES.includes(file.type as never)) {
      return Response.json(
        { success: false, error: "Tipe file tidak diizinkan (gambar, PDF, atau Word)" },
        { status: 400 },
      );
    }

    // Validate size
    const isImage = file.type.startsWith("image/");
    const limit = isImage ? CHAT_SIZE_LIMITS.image : CHAT_SIZE_LIMITS.document;
    if (file.size > limit) {
      const limitLabel = isImage ? "500 KB" : "1 MB";
      return Response.json(
        { success: false, error: `Ukuran file melebihi batas ${limitLabel}` },
        { status: 400 },
      );
    }

    // Build storage path scoped to user
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const svc = createServiceClient();
    const { error: uploadError } = await svc.storage
      .from("chat-attachments")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return Response.json({ success: false, error: "Upload gagal, coba lagi" }, { status: 500 });
    }

    const { data: urlData } = svc.storage.from("chat-attachments").getPublicUrl(path);

    return Response.json({
      success: true,
      data: {
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      },
    });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
