import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  // Hanya izinkan path relatif untuk mencegah open-redirect
  const next = nextRaw.startsWith("/") ? nextRaw : "/dashboard";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("error", errorDescription ?? error);
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    // Buat response redirect dulu, lalu set cookies LANGSUNG ke response ini.
    // Jika cookies di-set ke cookieStore (next/headers) dan response dibuat
    // terpisah via NextResponse.redirect(), cookies tidak ikut terbawa ke browser.
    const redirectUrl = new URL(next, origin);
    const response = NextResponse.redirect(redirectUrl);

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Kirim welcome email untuk user yang baru daftar (created < 60 detik lalu)
      const user = data.user;
      if (user?.email) {
        const createdAt = new Date(user.created_at).getTime();
        const isNewUser = Date.now() - createdAt < 60_000;
        if (isNewUser) {
          const name =
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            user.email;
          sendWelcomeEmail({ to: user.email, name }).catch(() => {});
        }
      }
      return response;
    }
  }

  const failUrl = new URL("/login", origin);
  failUrl.searchParams.set("error", "Autentikasi gagal. Coba lagi.");
  return NextResponse.redirect(failUrl);
}
