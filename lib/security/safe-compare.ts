import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Bandingkan secret secara timing-safe. Fail-closed: secret kosong / tidak
 * dikonfigurasi selalu menghasilkan false.
 */
export function secretMatches(received: string | null | undefined, expected: string | null | undefined): boolean {
  const exp = expected?.trim();
  const rec = received?.trim();
  if (!exp || !rec) return false;
  const a = createHash("sha256").update(rec).digest();
  const b = createHash("sha256").update(exp).digest();
  return timingSafeEqual(a, b);
}
