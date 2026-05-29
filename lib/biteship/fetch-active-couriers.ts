type BiteshipCourierService = {
  courier_code?: string;
  courier_service_code?: string;
};

type BiteshipCouriersResponse = {
  success?: boolean;
  // Biteship returns couriers as a nested object: { courier_services: [...] }
  couriers?:
    | BiteshipCourierService[]
    | { courier_services?: BiteshipCourierService[] };
};

const FALLBACK = "jne,sicepat,anteraja,tiki";
const TTL_MS = 60 * 60 * 1000; // 1 hour

let cache: { value: string; expiresAt: number } | null = null;

function extractServices(
  raw: BiteshipCouriersResponse["couriers"],
): BiteshipCourierService[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object" && "courier_services" in raw) {
    return raw.courier_services ?? [];
  }
  return [];
}

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

    if (!res.ok || !json.success) {
      console.warn("[Biteship couriers] Gagal fetch, pakai fallback.", res.status);
      return FALLBACK;
    }

    const services = extractServices(json.couriers);

    // Deduplicate — multiple services share the same courier_code (e.g. jne REG + jne YES)
    const codes = [
      ...new Set(
        services
          .map((s) => (s.courier_code ?? "").toLowerCase())
          .filter(Boolean),
      ),
    ];

    if (codes.length === 0) {
      console.warn("[Biteship couriers] Tidak ada courier code, pakai fallback.");
      return FALLBACK;
    }

    const value = codes.join(",");
    cache = { value, expiresAt: now + TTL_MS };
    console.info("[Biteship couriers] Couriers aktif:", value);
    return value;
  } catch (err) {
    console.warn("[Biteship couriers] Network error, pakai fallback.", err);
    return FALLBACK;
  }
}

/** Invalidate cache — call setelah update konfigurasi courier di Biteship */
export function invalidateActiveCouriersCache(): void {
  cache = null;
}
