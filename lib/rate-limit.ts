import { NextResponse } from "next/server";

/**
 * Rate limiter fixed-window di memori proses.
 * Production (VPS) = satu proses Node, jadi hitungan konsisten. Di Vercel
 * (sandbox) tiap instance punya hitungan sendiri — tetap membatasi burst.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(req: Request): string {
  // Proxy (Apache/Vercel) menambahkan IP klien di ujung kanan X-Forwarded-For;
  // nilai di kiri bisa dipalsukan klien.
  const xff = req.headers.get("x-forwarded-for");
  const last = xff?.split(",").map((s) => s.trim()).filter(Boolean).pop();
  return last || req.headers.get("x-real-ip") || "unknown";
}

function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}

/**
 * Kembalikan respons 429 jika melewati batas, atau null jika boleh lanjut.
 * @param name   nama endpoint (kunci terpisah per endpoint)
 * @param limit  jumlah request maksimum per jendela
 * @param windowMs panjang jendela (ms)
 */
export function rateLimit(req: Request, name: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  sweep(now);
  const key = `${name}:${clientIp(req)}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  bucket.count += 1;
  if (bucket.count <= limit) return null;
  const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
  return NextResponse.json(
    { success: false, error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export const MINUTE = 60_000;
