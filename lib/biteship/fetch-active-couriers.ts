export type BiteshipCourierService = {
  courier_code: string;
  courier_service_code: string;
  courier_name: string;
  courier_service_name: string;
};

export async function fetchAllBiteshipCouriers(): Promise<BiteshipCourierService[]> {
  const key = process.env.BITESHIP_API_KEY?.trim();
  if (!key) return [];

  try {
    const res = await fetch("https://api.biteship.com/v1/couriers", {
      headers: {
        Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`,
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    const json = (await res.json()) as { success?: boolean; couriers?: unknown };
    if (!res.ok || !json.success) return [];

    const raw = json.couriers;
    const services: unknown[] = Array.isArray(raw)
      ? raw
      : ((raw as { courier_services?: unknown[] })?.courier_services ?? []);

    return (services as Array<Record<string, unknown>>)
      .filter((s) => s.courier_code && s.courier_service_code)
      .map((s) => ({
        courier_code: String(s.courier_code),
        courier_service_code: String(s.courier_service_code),
        courier_name: String(s.courier_name ?? s.courier_code),
        courier_service_name: String(s.courier_service_name ?? s.courier_service_code),
      }));
  } catch {
    return [];
  }
}
