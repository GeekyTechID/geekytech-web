/** Shared utilities for on-demand courier (GoSend, GrabExpress, etc.) coordinate resolution. */

export const ON_DEMAND_COURIERS = new Set([
  "gojek",
  "grab",
  "gosend",
  "borzo",
  "lalamove",
  "deliveree",
  "rara",
]);

export type OriginCoords = { lat: number; lng: number };

function parseFromEnv(): OriginCoords | null {
  const combined = process.env.GOJEK_GOSEND_LAT_LANG?.trim();
  if (combined) {
    const [lat, lng] = combined.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const lat = Number(process.env.GOJEK_GOSEND_LAT?.trim());
  // GOJEK_GOSEN_LANG is kept as legacy fallback (typo variant still supported)
  const lng = Number(
    process.env.GOJEK_GOSEND_LANG?.trim() ?? process.env.GOJEK_GOSEN_LANG?.trim(),
  );
  if (Number.isFinite(lat) && lat !== 0 && Number.isFinite(lng) && lng !== 0) {
    return { lat, lng };
  }
  return null;
}

function parseFromSettings(
  storeOrigin: { lat?: string; lng?: string } | null | undefined,
): OriginCoords | null {
  if (!storeOrigin) return null;
  const lat = parseFloat(storeOrigin.lat ?? "");
  const lng = parseFloat(storeOrigin.lng ?? "");
  if (Number.isFinite(lat) && lat !== 0 && Number.isFinite(lng) && lng !== 0) {
    return { lat, lng };
  }
  return null;
}

/**
 * Resolve origin lat/lng for on-demand couriers.
 * Priority: GOJEK_GOSEND_LAT_LANG env var → individual env vars → store_origin DB setting.
 * The storeOrigin parameter comes from the `store_origin` settings row (configurable in admin UI).
 */
export function parseOriginCoords(
  storeOrigin?: { lat?: string; lng?: string } | null,
): OriginCoords | null {
  return parseFromEnv() ?? parseFromSettings(storeOrigin);
}
