import { createClient } from "@/lib/supabase/server";

const BUCKET = "complaint-images";
const MAX_SIZE_MB = 50;
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};
const ALLOWED_TYPES = Object.keys(EXT_BY_MIME);

/** URL media komplain/retur harus file di folder pesanan itu sendiri di bucket kita. */
export function isOwnComplaintMediaUrl(url: string, orderId: string): boolean {
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${orderId}/`;
  return url.startsWith(prefix) && /^[\w.-]+$/.test(url.slice(prefix.length));
}

export async function uploadComplaintMedia(
  file: File,
  orderId: string,
): Promise<{ url: string } | { error: string }> {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { error: `File terlalu besar (maks ${MAX_SIZE_MB} MB).` };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Format tidak didukung. Gunakan JPG, PNG, atau MP4/MOV." };
  }

  const ext = EXT_BY_MIME[file.type];
  const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
