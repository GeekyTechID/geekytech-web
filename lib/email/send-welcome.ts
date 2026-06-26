import { FROM_EMAIL, resend } from "@/lib/email/resend";
import { welcomeEmailHtml } from "@/lib/email/templates/welcome";

export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://geeky.id";

  await resend.emails.send({
    from: `GeekyTech <${FROM_EMAIL}>`,
    to,
    subject: "Selamat Datang di GeekyTech! 🎉",
    html: welcomeEmailHtml({ name, appUrl }),
  });
}
