type NominatimResult = {
  lat?: string;
  lon?: string;
};

/** Lookup lat/lng dari kode pos via OpenStreetMap Nominatim (gratis, tanpa API key). */
export async function fetchCoordinatesFromPostal(
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
