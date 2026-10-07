/**
 * Nomor CS WhatsApp (NEXT_PUBLIC_WHATSAPP_NUMBER) dalam format internasional
 * tanpa "+", mis. "0819…" / "+62 819…" → "62819…". wa.me menolak awalan 0.
 */
export function csWhatsAppDigits(): string {
  const digits = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

/**
 * Membangun URL wa.me untuk CS (NEXT_PUBLIC_WHATSAPP_NUMBER).
 */
export function buildWhatsAppUrl(message: string): string | null {
  const digits = csWhatsAppDigits();
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
