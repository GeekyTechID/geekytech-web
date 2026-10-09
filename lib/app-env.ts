/**
 * Lingkungan aplikasi: `production` (geeky.id + db_production) atau `sandbox`
 * (local + Vercel + db_sandbox). Default sandbox — production wajib set
 * NEXT_PUBLIC_APP_ENV=production secara eksplisit, jadi salah konfigurasi
 * terlihat sebagai banner sandbox, bukan diam-diam dianggap production.
 */
export type AppEnv = "production" | "sandbox";

export const APP_ENV: AppEnv =
  process.env.NEXT_PUBLIC_APP_ENV === "production" ? "production" : "sandbox";

export const IS_SANDBOX = APP_ENV === "sandbox";

export const SANDBOX_LABEL = "SANDBOX";

/** Project ref Supabase db_production — bukan rahasia (ada di URL publik). */
export const PRODUCTION_SUPABASE_REF = "xvgcmqpnrloqbneacdpx";

/**
 * Mencegah salah sambung: production harus ke db_production + Mayar live,
 * sandbox tidak boleh menyentuh db_production / Mayar live.
 * Mengembalikan daftar masalah (kosong = aman).
 */
export function checkAppEnvConsistency(env: NodeJS.ProcessEnv = process.env): string[] {
  const problems: string[] = [];
  const appEnv: AppEnv = env.NEXT_PUBLIC_APP_ENV === "production" ? "production" : "sandbox";
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const pointsToProdDb = supabaseUrl.includes(PRODUCTION_SUPABASE_REF);
  // Sama dengan lib/mayar/client.ts: case-insensitive ("True" di .env.production).
  const mayarLive = env.MAYAR_IS_PRODUCTION?.trim().toLowerCase() === "true";

  if (appEnv === "production") {
    if (!pointsToProdDb) problems.push("APP_ENV=production tetapi NEXT_PUBLIC_SUPABASE_URL bukan db_production");
    if (!mayarLive) problems.push("APP_ENV=production tetapi MAYAR_IS_PRODUCTION bukan true");
  } else {
    if (pointsToProdDb) problems.push("APP_ENV=sandbox tetapi NEXT_PUBLIC_SUPABASE_URL mengarah ke db_production");
    if (mayarLive) problems.push("APP_ENV=sandbox tetapi MAYAR_IS_PRODUCTION=true (Mayar live)");
  }
  return problems;
}
