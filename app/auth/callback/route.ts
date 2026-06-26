import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

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

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      return response;
    }
  }

  const failUrl = new URL("/login", origin);
  failUrl.searchParams.set("error", "Autentikasi gagal. Coba lagi.");
  return NextResponse.redirect(failUrl);
}
