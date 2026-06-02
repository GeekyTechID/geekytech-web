# Address Coordinates (On-Demand Couriers) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture lat/lng on user addresses (optional Leaflet map pin + auto area-centroid), snapshot it onto orders, and feed it to Biteship as the destination coordinate so GoSend/Grab (on-demand) orders are created reliably and accurately.

**Architecture:** Add nullable `lat`/`lng` columns to `addresses` and `shipping_lat`/`shipping_lng` to `orders`. The address form gets a plain-Leaflet `LocationPicker` (draggable pin + GPS button); when the user picks an area, the map centers on a Nominatim-geocoded centroid. Coordinates are snapshotted to the order at checkout. At settlement, the shared `resolveOnDemandCoords` prefers the order's snapshot coordinates and falls back to the existing postal→coordinate resolution, so old addresses still work.

**Tech Stack:** Next.js 15 (App Router) + TypeScript, Supabase (Postgres), Leaflet (plain, no react-leaflet — avoids React peer-dep/SSR issues), OpenStreetMap Nominatim for geocoding, Zod validation.

**Testing note:** This repo has **no test runner**. Per the approved spec, each task is verified with `npx tsc --noEmit` + `npx eslint <files>` (real automated gates), a one-off `node` assertion script for the single pure function, and explicit manual/DB verification for UI and integration. Spec: `docs/superpowers/specs/2026-06-02-address-coordinates-design.md`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `supabase/migrations/021_address_coordinates.sql` (create) | Add coordinate columns |
| `types/supabase.ts` (regenerate) | Pick up new columns for TS |
| `lib/geo/geocode-area.ts` (create) | Geocode area centroid + Indonesia bounds check |
| `app/api/geo/area-centroid/route.ts` (create) | POST endpoint wrapping the geocoder |
| `app/(dashboard)/dashboard/addresses/_actions.ts` (modify) | Accept/validate/persist lat/lng |
| `components/dashboard/location-picker.tsx` (create) | Leaflet map + draggable pin + GPS button |
| `components/dashboard/address-form.tsx` (modify) | Integrate picker, centroid fetch, submit lat/lng |
| `app/api/checkout/create/route.ts` (modify) | Snapshot address coords → order |
| `lib/shipping/on-demand-coords.ts` (modify) | `resolveOnDemandCoords` prefers snapshot dest coords |
| `app/api/webhooks/midtrans/route.ts` (modify) | Pass order snapshot coords to resolver |
| `app/api/orders/[id]/verify-payment/route.ts` (modify) | Pass order snapshot coords to resolver |
| `package.json` (modify) | Add `leaflet` + `@types/leaflet` |

---

## Task 1: Database migration + types

**Files:**
- Create: `supabase/migrations/021_address_coordinates.sql`
- Regenerate: `types/supabase.ts`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/021_address_coordinates.sql`:

```sql
-- 021: koordinat alamat untuk kurir on-demand (GoSend/Grab/Borzo/dll)
-- Semua nullable agar alamat & order lama tidak terpengaruh.
ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_lat double precision,
  ADD COLUMN IF NOT EXISTS shipping_lng double precision;
```

- [ ] **Step 2: Apply the migration to Supabase**

Apply via the Supabase MCP `apply_migration` tool (project `xvgcmqpnrloqbneacdpx`, name `address_coordinates`, body = the SQL above), or paste into Supabase Dashboard → SQL Editor and run.

- [ ] **Step 3: Verify columns exist**

Run this query (Supabase MCP `execute_sql`, project `xvgcmqpnrloqbneacdpx`):

```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema='public'
  AND ((table_name='addresses' AND column_name IN ('lat','lng'))
    OR (table_name='orders' AND column_name IN ('shipping_lat','shipping_lng')))
ORDER BY table_name, column_name;
```
Expected: 4 rows, all `double precision`.

- [ ] **Step 4: Regenerate Supabase types**

Regenerate `types/supabase.ts` (Supabase MCP `generate_typescript_types` for project `xvgcmqpnrloqbneacdpx`, overwrite the file; or `npx supabase gen types typescript --project-id xvgcmqpnrloqbneacdpx > types/supabase.ts`).
Confirm the file now contains `lat`, `lng` under `addresses` and `shipping_lat`, `shipping_lng` under `orders`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0 (no errors introduced by the regenerated types).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/021_address_coordinates.sql types/supabase.ts
git commit -m "feat(db): add lat/lng to addresses and shipping_lat/lng to orders"
```

---

## Task 2: Geocode-area utility

**Files:**
- Create: `lib/geo/geocode-area.ts`
- Test (one-off): `/tmp/test-geocode-area.mjs`

- [ ] **Step 1: Write the utility**

Create `lib/geo/geocode-area.ts`:

```ts
/** Geocode the centroid of an Indonesian administrative area via OpenStreetMap Nominatim. */

export type LatLng = { lat: number; lng: number };

/** Rough bounding box of Indonesia. Rejects obviously-wrong coordinates. */
export function isWithinIndonesia(lat: number, lng: number): boolean {
  return lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141;
}

async function nominatimSearch(query: string): Promise<LatLng | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=id`,
      {
        headers: { "User-Agent": "GeekyTech/1.0 (geekytech.com)", Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { lat?: string; lon?: string }[];
    const first = json[0];
    if (!first?.lat || !first?.lon) return null;
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isWithinIndonesia(lat, lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * Resolve an approximate centroid for an area. Tries the full
 * "district, city, province" string first, then the postal code.
 */
export async function geocodeAreaCentroid(input: {
  district?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}): Promise<LatLng | null> {
  const parts = [input.district, input.city, input.province].map((p) => p?.trim()).filter(Boolean);
  const queries: string[] = [];
  if (parts.length) queries.push(`${parts.join(", ")}, Indonesia`);
  if (input.postalCode?.trim()) queries.push(`${input.postalCode.trim()}, Indonesia`);

  for (const q of queries) {
    const hit = await nominatimSearch(q);
    if (hit) return hit;
  }
  return null;
}
```

- [ ] **Step 2: Write a one-off assertion script for the pure function**

Create `/tmp/test-geocode-area.mjs` (mirrors the `isWithinIndonesia` logic — the repo has no TS test runner, so this validates the bounds logic directly):

```js
function isWithinIndonesia(lat, lng) {
  return lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141;
}
const cases = [
  [-6.2, 106.8, true],   // Jakarta
  [-7.25, 112.75, true], // Surabaya
  [40.7, -74.0, false],  // New York
  [0, 0, false],         // null island
];
let ok = true;
for (const [lat, lng, want] of cases) {
  const got = isWithinIndonesia(lat, lng);
  if (got !== want) { console.error(`FAIL ${lat},${lng} => ${got} (want ${want})`); ok = false; }
}
console.log(ok ? "PASS all bounds cases" : "FAIL");
process.exit(ok ? 0 : 1);
```

- [ ] **Step 3: Run the assertion script**

Run: `node /tmp/test-geocode-area.mjs`
Expected: `PASS all bounds cases`, exit 0.

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint lib/geo/geocode-area.ts`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
rm -f /tmp/test-geocode-area.mjs
git add lib/geo/geocode-area.ts
git commit -m "feat(geo): add geocodeAreaCentroid + Indonesia bounds check"
```

---

## Task 3: Geocode endpoint

**Files:**
- Create: `app/api/geo/area-centroid/route.ts`

- [ ] **Step 1: Write the route**

Create `app/api/geo/area-centroid/route.ts`:

```ts
import { z } from "zod";

import { geocodeAreaCentroid } from "@/lib/geo/geocode-area";

const schema = z.object({
  district: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  province: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(10).optional(),
});

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ success: false, error: "Permintaan tidak valid." }, { status: 400 });
    }
    const coords = await geocodeAreaCentroid(parsed.data);
    return Response.json({ success: true, data: coords });
  } catch {
    return Response.json({ success: false, error: "Gagal mencari koordinat." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint app/api/geo/area-centroid/route.ts`
Expected: exit 0.

- [ ] **Step 3: Manual smoke test (dev server running)**

With `npm run dev` running, run:
```bash
curl -s -X POST http://localhost:3000/api/geo/area-centroid \
  -H 'Content-Type: application/json' \
  -d '{"district":"Pancoran","city":"Jakarta Selatan","province":"DKI Jakarta","postalCode":"12740"}'
```
Expected: `{"success":true,"data":{"lat":-6.2...,"lng":106.8...}}` (coordinates inside Indonesia). `data` may be `null` if Nominatim has no hit — that is acceptable (fallback handles it downstream).

- [ ] **Step 4: Commit**

```bash
git add app/api/geo/area-centroid/route.ts
git commit -m "feat(api): add area-centroid geocoding endpoint"
```

---

## Task 4: Address actions accept lat/lng

**Files:**
- Modify: `app/(dashboard)/dashboard/addresses/_actions.ts`

- [ ] **Step 1: Add a coordinate Zod helper and extend the schema**

In `app/(dashboard)/dashboard/addresses/_actions.ts`, replace the `addressSchema` definition (currently lines 10-21) with the version below. The `coord` preprocessor coerces missing/invalid/out-of-range values to `null` instead of failing validation (spec: never hard-block an address over coordinates):

```ts
/** Coerce a coordinate to a number within [min,max], else null (never throws). */
const coord = (min: number, max: number) =>
  z.preprocess((val) => {
    const n = typeof val === "number" ? val : typeof val === "string" ? parseFloat(val) : NaN;
    return Number.isFinite(n) && (n as number) >= min && (n as number) <= max ? n : null;
  }, z.number().nullable());

const addressSchema = z.object({
  label: z.string().trim().max(80).optional().nullable(),
  recipient: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
  province: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  kelurahan: z.string().trim().max(80).optional().default(""),
  postal_code: z.coerce.string().trim().min(3).max(10),
  full_address: z.string().trim().min(5).max(500),
  is_default: z.boolean().optional(),
  lat: coord(-11, 6).optional(),
  lng: coord(95, 141).optional(),
});
```

- [ ] **Step 2: Persist lat/lng in `createAddressAction` insert**

In `createAddressAction`, in the `supabase.from("addresses").insert({ ... })` object, add these two properties after `is_default: v.is_default ?? false,`:

```ts
      lat: v.lat ?? null,
      lng: v.lng ?? null,
```

- [ ] **Step 3: Persist lat/lng in `updateAddressAction` update**

In `updateAddressAction`, in the `.update({ ... })` object, add these two properties after `is_default: v.is_default ?? false,` (before `updated_at`):

```ts
        lat: v.lat ?? null,
        lng: v.lng ?? null,
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint "app/(dashboard)/dashboard/addresses/_actions.ts"`
Expected: exit 0. (If tsc complains that `lat`/`lng` don't exist on the insert/update type, Task 1's types regen was incomplete — fix that first.)

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/dashboard/addresses/_actions.ts"
git commit -m "feat(addresses): accept and persist optional lat/lng"
```

---

## Task 5: Install Leaflet + LocationPicker component

**Files:**
- Modify: `package.json` (+ `package-lock.json`)
- Create: `components/dashboard/location-picker.tsx`

- [ ] **Step 1: Install Leaflet**

Run: `npm install leaflet && npm install -D @types/leaflet`
Expected: installs succeed; `leaflet` appears in `package.json` dependencies. (We use plain Leaflet imperatively — NOT react-leaflet — to avoid React 19 peer-dependency conflicts.)

- [ ] **Step 2: Write the LocationPicker component**

Create `components/dashboard/location-picker.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, LeafletMouseEvent } from "leaflet";

import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";

export type LatLng = { lat: number; lng: number };

interface LocationPickerProps {
  value: LatLng | null;
  onChange: (coords: LatLng) => void;
  /** Center to fly to when the user selects an area (only used before a manual pin). */
  center?: LatLng | null;
}

const JAKARTA: LatLng = { lat: -6.2088, lng: 106.8456 };

export function LocationPicker({ value, onChange, center }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const hasManualPinRef = useRef<boolean>(value != null);

  // Init the map once (client-only; Leaflet needs window).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      const start = value ?? center ?? JAKARTA;
      const map = L.map(containerRef.current).setView([start.lat, start.lng], value || center ? 15 : 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([start.lat, start.lng], { draggable: true, icon }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        hasManualPinRef.current = true;
        onChange({ lat: p.lat, lng: p.lng });
      });
      map.on("click", (e: LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        hasManualPinRef.current = true;
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapRef.current = map;
      markerRef.current = marker;
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the user picks a new area, recenter — but only if they haven't manually pinned.
  useEffect(() => {
    if (!center || hasManualPinRef.current || !mapRef.current || !markerRef.current) return;
    mapRef.current.setView([center.lat, center.lng], 15);
    markerRef.current.setLatLng([center.lat, center.lng]);
    onChange(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lng]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      hasManualPinRef.current = true;
      mapRef.current?.setView([p.lat, p.lng], 16);
      markerRef.current?.setLatLng([p.lat, p.lng]);
      onChange(p);
    });
  };

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-lg border border-[#e0e0e0]" />
      <div className="flex items-center justify-between">
        <Button type="button" variant="secondary" size="sm" onClick={useMyLocation}>
          Pakai lokasi saya
        </Button>
        <span className="text-[11px] text-[#9a9a9a]">
          {value ? `Pin: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : "Geser pin ke lokasi rumah (opsional)"}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint components/dashboard/location-picker.tsx`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json components/dashboard/location-picker.tsx
git commit -m "feat(addresses): add Leaflet LocationPicker component"
```

---

## Task 6: Integrate LocationPicker into the address form

**Files:**
- Modify: `components/dashboard/address-form.tsx`

- [ ] **Step 1: Add imports**

In `components/dashboard/address-form.tsx`, after the existing imports, add:

```tsx
import dynamic from "next/dynamic";
import type { LatLng } from "@/components/dashboard/location-picker";

const LocationPicker = dynamic(
  () => import("@/components/dashboard/location-picker").then((m) => m.LocationPicker),
  { ssr: false, loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-[#f0f0f0]" /> },
);
```

- [ ] **Step 2: Add coordinate + center state**

Inside the `AddressForm` component, after the existing `useState` hooks (after `postalCode`), add:

```tsx
  const [coords, setCoords] = useState<LatLng | null>(
    initial?.lat != null && initial?.lng != null ? { lat: initial.lat, lng: initial.lng } : null,
  );
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
```

- [ ] **Step 3: Fetch the centroid when an area is selected**

Replace the existing `handleAreaSelect` function with this version (it keeps the field-fill behavior and adds a centroid lookup to recenter the map):

```tsx
  const handleAreaSelect = (area: BiteshipArea) => {
    setProvince(area.administrative_division_level_1_name);
    setCity(area.administrative_division_level_2_name);
    setDistrict(area.administrative_division_level_3_name);
    setPostalCode(String(area.postal_code));

    void (async () => {
      try {
        const res = await fetch("/api/geo/area-centroid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            district: area.administrative_division_level_3_name,
            city: area.administrative_division_level_2_name,
            province: area.administrative_division_level_1_name,
            postalCode: String(area.postal_code),
          }),
        });
        const json = (await res.json()) as { success: boolean; data: LatLng | null };
        if (json.success && json.data) setMapCenter(json.data);
      } catch {
        // centroid optional — pin tetap bisa digeser manual
      }
    })();
  };
```

- [ ] **Step 4: Add lat/lng to the submit payload**

In the `onSubmit` handler, in the `payload` object, add after `is_default: fd.get("is_default") != null,`:

```tsx
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
```

- [ ] **Step 5: Render the picker**

Immediately after the closing `</div>` of the "Cari area otomatis" block (the `rounded-lg border ... bg-[#fafaf8]` block), add:

```tsx
      <div className="rounded-lg border border-[#e8e4dc] bg-[#fafaf8] p-4">
        <p className="mb-2 text-xs font-semibold uppercase text-[#7a7a7a]">
          Titik lokasi (untuk kurir instan: GoSend/Grab)
        </p>
        <LocationPicker value={coords} onChange={setCoords} center={mapCenter} />
        <p className="mt-2 text-[11px] text-[#9a9a9a]">
          Opsional. Jika tidak diisi, sistem memakai titik area otomatis.
        </p>
      </div>
```

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint components/dashboard/address-form.tsx`
Expected: exit 0.

- [ ] **Step 7: Manual verification (dev server)**

With `npm run dev`: go to `/dashboard/addresses/new`. Pick an area in the autocomplete → the map recenters and drops a pin. Drag the pin / click the map / press "Pakai lokasi saya" → the coordinate caption updates. Save → no error toast.

- [ ] **Step 8: Verify persistence (DB)**

Run (Supabase MCP `execute_sql`, project `xvgcmqpnrloqbneacdpx`):
```sql
SELECT id, recipient, lat, lng, created_at FROM addresses ORDER BY created_at DESC LIMIT 3;
```
Expected: the address you just created has non-null `lat`/`lng` (from pin or centroid).

- [ ] **Step 9: Commit**

```bash
git add components/dashboard/address-form.tsx
git commit -m "feat(addresses): capture coordinates in address form via map picker"
```

---

## Task 7: Snapshot coordinates onto the order at checkout

**Files:**
- Modify: `app/api/checkout/create/route.ts`

- [ ] **Step 1: Add the snapshot fields to the order insert**

In `app/api/checkout/create/route.ts`, the `svc.from("orders").insert({ ... })` call (around line 242) builds the order from `address`. `address` comes from `fetchAddressForUser`, which selects `*`, so `address.lat` / `address.lng` are available. Add these two properties to the insert object, right after `shipping_address: address.full_address,`:

```ts
        shipping_lat: address.lat ?? null,
        shipping_lng: address.lng ?? null,
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint app/api/checkout/create/route.ts`
Expected: exit 0.

- [ ] **Step 3: Manual verification + DB check**

With `npm run dev`: complete a checkout using a Gojek-eligible address that has coordinates. Then run (Supabase MCP `execute_sql`):
```sql
SELECT order_number, courier_company, shipping_lat, shipping_lng, created_at
FROM orders ORDER BY created_at DESC LIMIT 3;
```
Expected: the new order has `shipping_lat`/`shipping_lng` matching the address's coordinates.

- [ ] **Step 4: Commit**

```bash
git add app/api/checkout/create/route.ts
git commit -m "feat(checkout): snapshot address coordinates onto order"
```

---

## Task 8: Prefer snapshot coordinates at settlement

**Files:**
- Modify: `lib/shipping/on-demand-coords.ts`
- Modify: `app/api/webhooks/midtrans/route.ts`
- Modify: `app/api/orders/[id]/verify-payment/route.ts`

- [ ] **Step 1: Extend `resolveOnDemandCoords` with a preferred destination**

In `lib/shipping/on-demand-coords.ts`, replace the entire `resolveOnDemandCoords` function with:

```ts
export async function resolveOnDemandCoords(
  courierCompany: string,
  destPostal: number,
  storeOrigin: { lat?: string; lng?: string } | null,
  preferredDest?: { lat: number | null; lng: number | null } | null,
): Promise<OnDemandCoordFields> {
  if (!ON_DEMAND_COURIERS.has(courierCompany.toLowerCase())) return {};
  const originCoords = parseOriginCoords(storeOrigin);
  if (!originCoords) return {};

  let destLat: number | undefined;
  let destLng: number | undefined;
  if (preferredDest && preferredDest.lat != null && preferredDest.lng != null) {
    // Snapshot from the order (most accurate — user pin / area centroid).
    destLat = preferredDest.lat;
    destLng = preferredDest.lng;
  } else {
    // Fallback for orders/addresses without stored coordinates.
    const destCoords = await fetchCoordinatesFromPostal(String(destPostal));
    destLat = destCoords?.lat;
    destLng = destCoords?.lng;
  }

  return {
    originLat: originCoords.lat,
    originLng: originCoords.lng,
    destLat,
    destLng,
  };
}
```

- [ ] **Step 2: Pass snapshot coords in the Midtrans webhook**

In `app/api/webhooks/midtrans/route.ts`:

(a) In the `orderFull` select (around line 164), add `shipping_lat, shipping_lng`:
```ts
        .select("courier_company, courier_service, recipient_name, recipient_phone, shipping_address, shipping_postal, shipping_lat, shipping_lng")
```

(b) Update the `resolveOnDemandCoords` call (around line 176) to pass the snapshot:
```ts
          const onDemandCoords = await resolveOnDemandCoords(orderFull.courier_company, postalNum, storeOrigin, {
            lat: orderFull.shipping_lat,
            lng: orderFull.shipping_lng,
          });
```

- [ ] **Step 3: Pass snapshot coords in verify-payment**

In `app/api/orders/[id]/verify-payment/route.ts`:

(a) In the `orderFull` select (around line 197), add `shipping_lat, shipping_lng`:
```ts
        .select("courier_company, courier_service, recipient_name, recipient_phone, shipping_address, shipping_postal, shipping_lat, shipping_lng")
```

(b) Update the `resolveOnDemandCoords` call (around line 215) to pass the snapshot:
```ts
          const onDemandCoords = await resolveOnDemandCoords(orderFull.courier_company, postalNum, storeOrigin, {
            lat: orderFull.shipping_lat,
            lng: orderFull.shipping_lng,
          });
```

- [ ] **Step 4: Typecheck + lint**

Run:
```bash
npx tsc --noEmit && npx eslint lib/shipping/on-demand-coords.ts "app/api/webhooks/midtrans/route.ts" "app/api/orders/[id]/verify-payment/route.ts"
```
Expected: exit 0.

- [ ] **Step 5: End-to-end verification (Biteship test key)**

With `npm run dev`: place + pay a Gojek order for an address that has coordinates. Then run (Supabase MCP `execute_sql`):
```sql
SELECT o.order_number, o.shipping_lat, o.shipping_lng, s.biteship_order_id, s.awb
FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
WHERE o.courier_company ILIKE 'gojek' ORDER BY o.created_at DESC LIMIT 3;
```
Expected: newest Gojek order has a `shipments` row with a non-null `biteship_order_id` (no "Biteship gagal" note in `order_status_history`). Also confirm it appears in the Biteship **Test mode** dashboard.

Then verify the fallback: place + pay a Gojek order for an **old** address (lat/lng null). The shipment should still be created via the postal fallback.

- [ ] **Step 6: Commit**

```bash
git add lib/shipping/on-demand-coords.ts "app/api/webhooks/midtrans/route.ts" "app/api/orders/[id]/verify-payment/route.ts"
git commit -m "feat(shipping): prefer order snapshot coordinates for on-demand destination"
```

---

## Done criteria

- New/edited addresses can store a precise pin or an auto area-centroid; coordinates persist in `addresses.lat/lng`.
- Orders snapshot the address coordinates into `orders.shipping_lat/lng` at checkout.
- On-demand (Gojek/Grab) orders are created in Biteship using the snapshot coordinate, with a postal-code fallback for addresses that have none — no on-demand order is blocked solely by missing coordinates.
- `npx tsc --noEmit` and `npx eslint` pass across all changed files.

## Out of scope (tracked separately)

- Hardening the destination-coordinate source for production (Biteship `destination_area_id` / a reliable geocoder) — already flagged as a separate task.
- Backfilling coordinates for existing addresses.
