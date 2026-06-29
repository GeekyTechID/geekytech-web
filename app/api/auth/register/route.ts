import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/send-welcome";
import { isTurnstileRequired } from "@/lib/auth/turnstile-config";

const bodySchema = z.object({
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  phone: z.string().min(10).max(20),
  email: z.string().email(),
  password: z.string().min(8),
  turnstileToken: z.string().optional(),
});

async function verifyTurnstile(token: string): Promise<boolean> {
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    });
    const json = (await res.json()) as { success: boolean };
    return json.success;
  } catch {
    return false;
  }
}

/**
 * Cek apakah email yang sudah terdaftar di auth boleh didaftarkan ulang.
 * Kasus: admin sudah hapus user (soft-delete di profiles), tapi auth.users masih ada.
 * Jika iya: hard-delete auth user lama agar email bebas, return true.
 */
async function tryCleanupDeletedAuthUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  email: string,
): Promise<boolean> {
  // Cari user di auth berdasarkan email
  const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = userList?.users.find((u) => u.email === email);
  if (!existingUser) return false;

  // Jangan hapus akun admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, deleted_at")
    .eq("id", existingUser.id)
    .maybeSingle();

  if (profile?.role === "admin") return false;

  // User sudah soft-deleted atau profile tidak ada (orphan) → boleh re-register
  if (!profile || profile.deleted_at) {
    await supabase.auth.admin.deleteUser(existingUser.id);
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Data tidak valid." }, { status: 400 });
    }

    const { email, password, first_name, last_name, phone, turnstileToken } = parsed.data;

    if (isTurnstileRequired()) {
      if (!turnstileToken) {
        return NextResponse.json(
          { success: false, error: "Verifikasi keamanan diperlukan." },
          { status: 400 },
        );
      }
      const valid = await verifyTurnstile(turnstileToken);
      if (!valid) {
        return NextResponse.json(
          { success: false, error: "Verifikasi keamanan gagal. Coba lagi." },
          { status: 400 },
        );
      }
    }

    const fullName = `${first_name.trim()} ${last_name.trim()}`.trim();

    // Gunakan origin dari request agar link aktivasi mengarah ke server yang sama
    // (Vercel preview → Vercel, VPS production → VPS).
    // Fallback ke NEXT_PUBLIC_APP_URL hanya jika berjalan di localhost.
    const reqUrl = new URL(request.url);
    const callbackOrigin =
      reqUrl.hostname === "localhost" || reqUrl.hostname === "127.0.0.1"
        ? (process.env.NEXT_PUBLIC_APP_URL ?? "https://geeky.id")
        : reqUrl.origin;

    const supabase = createServiceClient();

    const generateLinkParams = {
      type: "signup" as const,
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone.trim(),
          first_name: first_name.trim(),
          last_name: last_name.trim(),
        },
        redirectTo: `${callbackOrigin}/auth/callback?next=/dashboard`,
      },
    };

    let { data, error } = await supabase.auth.admin.generateLink(generateLinkParams);

    if (error) {
      const msg = error.message.toLowerCase();
      const isAlreadyRegistered =
        msg.includes("already registered") ||
        msg.includes("already been registered") ||
        msg.includes("user already exists");

      if (isAlreadyRegistered) {
        // Cek apakah user sudah dihapus (soft-delete) tapi masih ada di auth
        const cleaned = await tryCleanupDeletedAuthUser(supabase, email);
        if (cleaned) {
          // Retry setelah auth user lama dihapus
          const retry = await supabase.auth.admin.generateLink(generateLinkParams);
          data = retry.data;
          error = retry.error;
        }

        if (error || !data) {
          return NextResponse.json({ success: false, error: "EMAIL_EXISTS" }, { status: 409 });
        }
      } else {
        console.error("[auth/register] generateLink error:", error);
        return NextResponse.json(
          { success: false, error: "Terjadi kesalahan. Coba lagi." },
          { status: 500 },
        );
      }
    }

    const activationUrl = data.properties?.action_link;

    await sendWelcomeEmail({ to: email, name: fullName, activationUrl }).catch((err) => {
      console.error("[auth/register] sendWelcomeEmail error:", err);
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan. Coba lagi." },
      { status: 500 },
    );
  }
}
