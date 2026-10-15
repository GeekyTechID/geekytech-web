export type TrackingStep = {
  status: string;
  /** Human-readable description (catatan kurir, diterjemahkan bila template Biteship) */
  description: string;
  /** Raw note from Biteship — often contains location/hub detail */
  note: string;
  at: string | null;
  /** Foto bukti dari kurir (mis. bukti paket diterima) */
  images: string[];
};

export type TrackingResult =
  | { ok: true; waybillId: string; status: string; steps: TrackingStep[]; link: string | null }
  | { ok: false; error: string };

/** Biteship history entry — may contain a nested `history` array (recursive format) */
type BiteshipHistory = {
  status?: string;
  description?: string;
  note?: string;
  updated_at?: string;
  /** Nested history array — present in multi-leg / aggregated tracking responses */
  history?: BiteshipHistory[];
  service_type?: string;
  waybill_id?: string;
};

type BiteshipTrackingResponse = {
  success?: boolean;
  waybill_id?: string;
  status?: string;
  history?: BiteshipHistory[];
  link?: string;
};

/**
 * Recursively flattens nested Biteship history arrays.
 * Some couriers (e.g. multi-leg shipments) return history as:
 *   [ { history: [ { status, note, updated_at }, … ] } ]
 * Others return a flat array of step objects directly.
 * This function handles both and produces a single flat list.
 */
function flattenHistory(items: BiteshipHistory[]): BiteshipHistory[] {
  const out: BiteshipHistory[] = [];
  for (const item of items) {
    if (Array.isArray(item.history) && item.history.length > 0) {
      out.push(...flattenHistory(item.history));
    } else if (item.status) {
      out.push(item);
    }
  }
  return out;
}

// ─── Catatan kurir → teks pelanggan ─────────────────────────────────────────

/** Template catatan bawaan Biteship (bahasa Inggris) → Bahasa Indonesia. */
const BITESHIP_TEMPLATES: { re: RegExp; text: (m: RegExpMatchArray) => string }[] = [
  {
    re: /^Courier order is confirmed\.\s*(\S+) has been notified to pick up\.?(?:\s*Pickup Number:\s*(\S+))?/i,
    text: (m) =>
      `Pesanan dikonfirmasi. Kurir ${m[1].toUpperCase()} sudah dijadwalkan menjemput paket.` +
      (m[2] ? ` No. pickup: ${m[2]}` : ""),
  },
  { re: /^Courier has been allocated/i, text: () => "Kurir sudah ditugaskan untuk menjemput paket." },
  { re: /^Courier is on the way to pick ?up/i, text: () => "Kurir sedang menuju lokasi penjemputan." },
  { re: /^Item has been picked/i, text: () => "Paket sudah diambil kurir dan siap dikirim." },
  { re: /^Item is on the way|^Courier is on the way to (?:the )?destination/i, text: () => "Paket sedang diantar ke alamat tujuan." },
  { re: /^Item has been delivered/i, text: () => "Paket telah diterima." },
  { re: /^Item has been returned/i, text: () => "Paket dikembalikan ke pengirim." },
  { re: /^Courier order has been cancell?ed/i, text: () => "Pengiriman dibatalkan." },
];

/** Frasa manifest kurir (JNE/J&T/SiCepat, dll.) → Bahasa Indonesia. */
const MANIFEST_PHRASES: [RegExp, string][] = [
  [/^RECEIVED AT SORTING CENTER/i, "Tiba di sorting center"],
  [/^PROCESSED AT SORTING CENTER/i, "Diproses di sorting center"],
  [/^RECEIVED AT TRANSIT/i, "Tiba di transit"],
  [/^PROCESSED AT TRANSIT/i, "Diproses di transit"],
  [/^DEPARTED FROM TRANSIT/i, "Berangkat dari transit"],
  [/^RECEIVED AT WAREHOUSE/i, "Tiba di gudang kota tujuan"],
  [/^RECEIVED AT ORIGIN/i, "Tiba di gudang asal"],
  [/^SHIPMENT RECEIVED BY JNE COUNTER/i, "Diterima di counter JNE"],
  [/^WITH DELIVERY COURIER/i, "Paket dibawa kurir menuju alamatmu"],
];

/**
 * Catatan kurir → kalimat ramah pelanggan. Lokasi "[A] [A, B]" diringkas jadi
 * yang paling spesifik. Catatan yang tidak dikenali ditampilkan apa adanya.
 */
export function describeTrackingNote(note: string): string {
  const raw = note.trim();
  if (!raw) return "";

  for (const t of BITESHIP_TEMPLATES) {
    const m = raw.match(t.re);
    if (m) return t.text(m);
  }

  const locations = [...raw.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim()).filter(Boolean);
  const phrase = raw.replace(/\s*\[[^\]]*\]/g, "").trim();
  const translated = MANIFEST_PHRASES.find(([re]) => re.test(phrase))?.[1];
  if (!translated) return raw;
  const location = locations.at(-1);
  return location ? `${translated} — ${location}` : translated;
}

// ─── Live tracking ──────────────────────────────────────────────────────────

export async function fetchBiteshipTracking(
  waybillId: string,
  courierCode: string,
): Promise<TrackingResult> {
  const key = process.env.BITESHIP_API_KEY?.trim();
  if (!key) return { ok: false, error: "Biteship tidak dikonfigurasi." };

  try {
    const res = await fetch(
      `https://api.biteship.com/v1/trackings/${encodeURIComponent(waybillId)}?couriers=${encodeURIComponent(courierCode.toLowerCase())}`,
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

    // Flatten nested / recursive history, then sort chronologically (oldest → newest)
    const raw = flattenHistory(json.history ?? []);
    raw.sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta; // keep Biteship's default newest-first; caller reverses for display
    });

    const steps: TrackingStep[] = raw.map((h) => {
      const status = h.status ?? "";
      return {
        status,
        description: describeTrackingNote(h.description || h.note || ""),
        note: h.note ?? "",
        at: h.updated_at ?? null,
        images: [],
      };
    });

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

/** Entri yang disimpan webhook Biteship ke shipments.tracking_history (oldest → newest). */
export type DbTrackingEntry = { status?: string; note?: string; at?: string | null; images?: unknown };

/**
 * Konversi shipments.tracking_history (DB, urutan oldest → newest) menjadi
 * TrackingStep[] dalam urutan newest-first — sama seperti output Biteship live —
 * supaya komponen timeline (yang me-reverse) tetap konsisten apa pun sumbernya.
 */
export function trackingStepsFromHistory(history: unknown): TrackingStep[] {
  if (!Array.isArray(history)) return [];
  const steps = history
    .map((h): TrackingStep => {
      const e = (h ?? {}) as DbTrackingEntry;
      const status = (e.status ?? "").toLowerCase();
      const note = e.note ?? "";
      const images = Array.isArray(e.images)
        ? e.images.filter((u): u is string => typeof u === "string" && u.startsWith("https://"))
        : [];
      return { status, description: describeTrackingNote(note), note, at: e.at ?? null, images };
    })
    .filter((s) => s.status);
  return steps.reverse();
}
