import { FROM, resend } from "@/lib/email/resend";
import { welcomeEmailHtml } from "@/lib/email/templates/welcome";

export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://geeky.id";

  const { error } = await resend.emails.send(
    {
      from: FROM,
      to,
      subject: "Selamat Datang di GeekyTech!",
      html: welcomeEmailHtml({ name, appUrl }),
    },
    { idempotencyKey: `welcome-email/${to}` },
  );

  if (error) {
    console.error("[email] sendWelcomeEmail failed:", error);
  }
}
