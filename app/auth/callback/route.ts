import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";

// 10 menit — cukup untuk OAuth flow selesai
const NEW_USER_WINDOW_MS = 10 * 60 * 1000;

function isNewOAuthUser(user: User): boolean {
  const provider = user.app_metadata?.provider as string | undefined;
  // Email/password: welcome email sudah dikirim saat register via /api/auth/register
  if (!provider || provider === "email") return false;
  // OAuth (Google, dll): cek apakah baru saja dibuat
  return Date.now() - new Date(user.created_at).getTime() < NEW_USER_WINDOW_MS;
}

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
      const user = data.user;
      if (user?.email && isNewOAuthUser(user)) {
        const name =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email;
        sendWelcomeEmail({ to: user.email, name }).catch((err) => {
          console.error("[auth/callback] sendWelcomeEmail error:", err);
        });
      }
      return response;
    }
  }

  const failUrl = new URL("/login", origin);
  failUrl.searchParams.set("error", "Autentikasi gagal. Coba lagi.");
  return NextResponse.redirect(failUrl);
}
