type BiteshipAreaCoord = {
  latitude?: number;
  longitude?: number;
};

type BiteshipAreaItem = {
  coordinate?: BiteshipAreaCoord;
};

type BiteshipAreasResponse = {
  success?: boolean;
  areas?: BiteshipAreaItem[];
};

type NominatimResult = {
  lat?: string;
  lon?: string;
};

/** Lookup lat/lng via Biteship Areas API (primary — reliable for Indonesian postal codes). */
async function fetchFromBiteship(
  postalCode: string,
): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.BITESHIP_API_KEY?.trim();
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.biteship.com/v1/maps/areas?countries=ID&input=${encodeURIComponent(postalCode)}&type=single`,
      {
        headers: {
          Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;

    const json = (await res.json()) as BiteshipAreasResponse;
    if (!json.success || !Array.isArray(json.areas) || json.areas.length === 0) return null;

    const coord = json.areas[0]?.coordinate;
    if (!coord) return null;

    const lat = Number(coord.latitude);
    const lng = Number(coord.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

/** Fallback: lookup lat/lng via OpenStreetMap Nominatim (no API key required). */
async function fetchFromNominatim(
  postalCode: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postalCode)}&country=Indonesia&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "GeekyTech/1.0 (geekytech.com)",
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;

    const json = (await res.json()) as NominatimResult[];
    const first = json[0];
    if (!first?.lat || !first?.lon) return null;

    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * Resolve lat/lng for a given Indonesian postal code.
 * Tries Biteship Areas API first (most reliable for ID), falls back to Nominatim.
 */
export async function fetchCoordinatesFromPostal(
  postalCode: string,
): Promise<{ lat: number; lng: number } | null> {
  return (await fetchFromBiteship(postalCode)) ?? (await fetchFromNominatim(postalCode));
}
