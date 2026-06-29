import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://geeky.id";

    const supabase = createServiceClient();

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone.trim(),
          first_name: first_name.trim(),
          last_name: last_name.trim(),
        },
        redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("already registered") ||
        msg.includes("already been registered") ||
        msg.includes("user already exists")
      ) {
        return NextResponse.json({ success: false, error: "EMAIL_EXISTS" }, { status: 409 });
      }
      console.error("[auth/register] generateLink error:", error);
      return NextResponse.json(
        { success: false, error: "Terjadi kesalahan. Coba lagi." },
        { status: 500 },
      );
    }

    const activationUrl = data.properties.action_link;

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
