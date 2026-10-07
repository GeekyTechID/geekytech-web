import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

export const REFUND_PROOFS_BUCKET = "refund-proofs";
export const REFUND_PROOF_MAX_SIZE_MB = 5;
export const REFUND_PROOF_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Path bukti selalu di folder pesanannya — dicek ulang saat status disimpan. */
export function isRefundProofPathForOrder(path: string, orderId: string): boolean {
  return path.startsWith(`${orderId}/`) && !path.includes("..") && path.split("/").length === 2;
}

export async function uploadRefundProof(
  file: File,
  orderId: string,
): Promise<{ path: string } | { error: string }> {
  if (file.size > REFUND_PROOF_MAX_SIZE_MB * 1024 * 1024) {
    return { error: `File terlalu besar (maks ${REFUND_PROOF_MAX_SIZE_MB} MB).` };
  }
  if (!REFUND_PROOF_MIME_TYPES.includes(file.type)) {
    return { error: "Format tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF." };
  }

  const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXT_BY_MIME[file.type]}`;
  try {
    const { error } = await createServiceClient()
      .storage.from(REFUND_PROOFS_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { error: error.message };
    return { path };
  } catch {
    return { error: "Upload bukti transfer gagal. Coba lagi." };
  }
}

/**
 * Signed URL (1 jam) untuk bukti transfer. Bucket privat — panggil hanya
 * setelah memastikan pemanggil boleh melihat pesanan ini (admin / pemilik).
 */
export async function getRefundProofUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  try {
    const { data } = await createServiceClient()
      .storage.from(REFUND_PROOFS_BUCKET)
      .createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
