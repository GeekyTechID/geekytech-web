/** Shared utilities for on-demand courier (GoSend, GrabExpress, etc.) coordinate resolution. */

import { fetchCoordinatesFromPostal } from "@/lib/geo/geocode-destination";

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

export type OnDemandCoordFields = {
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
};

/**
 * Resolve the origin + destination lat/lng fields Biteship requires for on-demand
 * couriers (GoSend, GrabExpress, etc.). Returns an empty object for non-on-demand
 * couriers, or when origin coordinates are not configured (env var nor store_origin
 * DB setting) — callers then create the order without coordinates.
 *
 * Used by BOTH settlement paths (Midtrans webhook and verify-payment) so they
 * resolve coordinates identically. Keep this the single source of truth.
 */
export async function resolveOnDemandCoords(
  courierCompany: string,
  destPostal: number,
  storeOrigin: { lat?: string; lng?: string } | null,
): Promise<OnDemandCoordFields> {
  if (!ON_DEMAND_COURIERS.has(courierCompany.toLowerCase())) return {};
  const originCoords = parseOriginCoords(storeOrigin);
  if (!originCoords) return {};
  const destCoords = await fetchCoordinatesFromPostal(String(destPostal));
  return {
    originLat: originCoords.lat,
    originLng: originCoords.lng,
    destLat: destCoords?.lat,
    destLng: destCoords?.lng,
  };
}
