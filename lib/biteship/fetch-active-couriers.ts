type BiteshipCourier = {
  id?: string;
  courier_code?: string;
  name?: string;
};

type BiteshipCouriersResponse = {
  success?: boolean;
  couriers?: BiteshipCourier[];
};

const FALLBACK = "jne,sicepat,anteraja,tiki";
const TTL_MS = 60 * 60 * 1000; // 1 hour

let cache: { value: string; expiresAt: number } | null = null;

export async function fetchActiveCouriers(): Promise<string> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.value;
  }

  const key = process.env.BITESHIP_API_KEY?.trim();
  if (!key) return FALLBACK;

  try {
    const res = await fetch("https://api.biteship.com/v1/couriers", {
      method: "GET",
      headers: {
        Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const json = (await res.json()) as BiteshipCouriersResponse;

    if (!res.ok || !json.success || !Array.isArray(json.couriers) || json.couriers.length === 0) {
      console.warn("[Biteship couriers] Gagal fetch courier list, pakai fallback.", res.status);
      return FALLBACK;
    }

    // Biteship returns either `id` or `courier_code` depending on API version
    const codes = json.couriers
      .map((c) => (c.id ?? c.courier_code ?? "").toLowerCase())
      .filter(Boolean);

    if (codes.length === 0) return FALLBACK;

    const value = codes.join(",");
    cache = { value, expiresAt: now + TTL_MS };
    return value;
  } catch (err) {
    console.warn("[Biteship couriers] Network error, pakai fallback.", err);
    return FALLBACK;
  }
}

/** Invalidate cache — call ini setelah update konfigurasi courier di Biteship */
export function invalidateActiveCouriersCache(): void {
  cache = null;
}
