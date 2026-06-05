/** Turnstile aktif hanya di production saat site key tersedia. */
export function isTurnstileRequired(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
    process.env.NODE_ENV === "production"
  );
}
