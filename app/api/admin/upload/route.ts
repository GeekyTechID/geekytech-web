import { NextRequest, NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
// Hanya bucket gambar publik; bucket privat (refund-proofs) punya route sendiri.
const ALLOWED_BUCKETS = ["products", "brands", "banners", "coupons"];
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const bucket = (formData.get("bucket") as string | null) ?? "products";

  if (!file) {
    return NextResponse.json({ error: "File wajib diisi." }, { status: 400 });
  }

  if (!ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json({ error: "Bucket tidak valid." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Format tidak didukung. Gunakan JPG, PNG, WebP, atau GIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Ukuran file maksimal 5 MB." },
      { status: 400 }
    );
  }

  const ext = EXT_BY_MIME[file.type];
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const serviceSupabase = await createServiceClient();

  const { data, error } = await serviceSupabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = serviceSupabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return NextResponse.json({ url: urlData.publicUrl });
}
