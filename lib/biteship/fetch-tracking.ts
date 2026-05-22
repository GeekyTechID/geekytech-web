export type TrackingStep = {
  status: string;
  description: string;
  at: string | null;
};

export type TrackingResult =
  | { ok: true; waybillId: string; status: string; steps: TrackingStep[]; link: string | null }
  | { ok: false; error: string };

type BiteshipHistory = {
  status?: string;
  description?: string;
  note?: string;
  updated_at?: string;
};

type BiteshipTrackingResponse = {
  success?: boolean;
  waybill_id?: string;
  status?: string;
  history?: BiteshipHistory[];
  link?: string;
};

export async function fetchBiteshipTracking(
  waybillId: string,
  courierCode: string,
): Promise<TrackingResult> {
  const key = process.env.BITESHIP_API_KEY?.trim();
  if (!key) return { ok: false, error: "Biteship tidak dikonfigurasi." };

  const base = "https://api.biteship.com";

  try {
    const res = await fetch(
      `${base}/v1/trackings/${encodeURIComponent(waybillId)}?couriers=${encodeURIComponent(courierCode.toLowerCase())}`,
      {
        headers: {
          Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const json = (await res.json()) as BiteshipTrackingResponse;
    if (!res.ok || !json.success) {
      return { ok: false, error: "Data tracking belum tersedia." };
    }

    const steps: TrackingStep[] = (json.history ?? []).map((h) => ({
      status: h.status ?? "",
      description: h.description ?? h.note ?? h.status ?? "",
      at: h.updated_at ?? null,
    }));

    return {
      ok: true,
      waybillId: json.waybill_id ?? waybillId,
      status: json.status ?? "",
      steps,
      link: json.link ?? null,
    };
  } catch {
    return { ok: false, error: "Jaringan ke Biteship gagal." };
  }
}
