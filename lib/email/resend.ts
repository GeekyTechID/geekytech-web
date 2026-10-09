import { Resend } from "resend";

import { IS_SANDBOX, SANDBOX_LABEL } from "@/lib/app-env";

const client = new Resend(process.env.RESEND_API_KEY);

// Sandbox: semua subjek email diawali [SANDBOX] supaya tidak tertukar dengan email asli.
if (IS_SANDBOX) {
  const send = client.emails.send.bind(client.emails);
  client.emails.send = ((payload, options) =>
    send({ ...payload, subject: `[${SANDBOX_LABEL}] ${payload.subject}` }, options)) as typeof client.emails.send;
}

export const resend = client;
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@geeky.id";
export const FROM_NAME = process.env.RESEND_FROM_NAME ?? "GeekyTech";
export const FROM = `${FROM_NAME} <${FROM_EMAIL}>`;
export const ADMIN_EMAIL = process.env.RESEND_ADMIN_EMAIL ?? "admin@geeky.id";
