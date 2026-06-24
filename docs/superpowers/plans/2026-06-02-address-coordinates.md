# Address Coordinates (On-Demand Couriers) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture lat/lng on user addresses (optional Leaflet map pin + auto centering), snapshot it onto orders, and feed it to Biteship as the destination coordinate so GoSend/Grab (on-demand) orders are created reliably and accurately.

**Architecture:** Add nullable `lat`/`lng` columns to `addresses` and `shipping_lat`/`shipping_lng` to `orders`. The address form gets a plain-Leaflet `LocationPicker` (draggable pin + GPS button); when the user picks an area, the map centers on coordinates resolved by the existing cached geocoder. Coordinates are snapshotted to the order at checkout. At settlement, the shared `resolveOnDemandCoords` prefers the order's snapshot coordinates and falls back to the existing postal→coordinate resolution, so old addresses still work.

**Reuses existing work (committed in `5f74338`):** `lib/geo/geocode-destination.ts` already resolves postal→coordinate via cache (`geocode_cache`) → Geoapify → LocationIQ → Nominatim. This plan REUSES `fetchCoordinatesFromPostal` for the form's map centering and for the settlement fallback — it does NOT add a second geocoder.

**Tech Stack:** Next.js 15 (App Router) + TypeScript, Supabase (Postgres), Leaflet (plain, no react-leaflet — avoids React peer-dep/SSR issues), Zod validation.

**Testing note:** This repo has **no test runner**. Per the approved spec, each task is verified with `npx tsc --noEmit` + `npx eslint <files>` (real automated gates) plus explicit manual/DB verification. Spec: `docs/superpowers/specs/2026-06-02-address-coordinates-design.md`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `supabase/migrations/022_address_coordinates.sql` (create) | Add coordinate columns (021 is already taken by `021_geocode_cache.sql`) |
| `types/supabase.ts` (regenerate) | Pick up new columns for TS |
| `app/api/geo/postal-coords/route.ts` (create) | POST endpoint wrapping the existing `fetchCoordinatesFromPostal` |
| `app/(dashboard)/dashboard/addresses/_actions.ts` (modify) | Accept/validate/persist lat/lng |
| `components/dashboard/location-picker.tsx` (create) | Leaflet map + draggable pin + GPS button |
| `components/dashboard/address-form.tsx` (modify) | Integrate picker, fetch postal coords for centering, submit lat/lng |
| `app/api/checkout/create/route.ts` (modify) | Snapshot address coords → order |
| `lib/shipping/on-demand-coords.ts` (modify) | `resolveOnDemandCoords` prefers snapshot dest coords |
| `app/api/webhooks/midtrans/route.ts` (modify) | Pass order snapshot coords to resolver |
| `app/api/orders/[id]/verify-payment/route.ts` (modify) | Pass order snapshot coords to resolver |
| `package.json` (modify) | Add `leaflet` + `@types/leaflet` |

---

## Task 1: Database migration + types

**Files:**
- Create: `supabase/migrations/022_address_coordinates.sql`
- Regenerate: `types/supabase.ts`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/022_address_coordinates.sql`:

```sql
-- 022: koordinat alamat untuk kurir on-demand (GoSend/Grab/Borzo/dll)
-- Semua nullable agar alamat & order lama tidak terpengaruh.
ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_lat double precision,
  ADD COLUMN IF NOT EXISTS shipping_lng double precision;
```

- [ ] **Step 2: Ensure migration 021 (geocode_cache) is applied, then apply 022**

The cached geocoder needs the `geocode_cache` table. First confirm/apply `021_geocode_cache.sql`, then apply `022`. Use Supabase MCP `apply_migration` (project `xvgcmqpnrloqbneacdpx`) for each, or paste into Supabase Dashboard → SQL Editor. `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` make both idempotent.

- [ ] **Step 3: Verify all columns/tables exist**

Run (Supabase MCP `execute_sql`, project `xvgcmqpnrloqbneacdpx`):

```sql
SELECT 'geocode_cache' AS obj, to_regclass('public.geocode_cache') IS NOT NULL AS exists
UNION ALL
SELECT 'addresses.lat', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='lat')
UNION ALL
SELECT 'addresses.lng', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='lng')
UNION ALL
SELECT 'orders.shipping_lat', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shipping_lat')
UNION ALL
SELECT 'orders.shipping_lng', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shipping_lng');
```
Expected: all rows `exists = true`.

- [ ] **Step 4: Regenerate Supabase types**

Regenerate `types/supabase.ts` (Supabase MCP `generate_typescript_types` for project `xvgcmqpnrloqbneacdpx`, overwrite the file; or `npx supabase gen types typescript --project-id xvgcmqpnrloqbneacdpx > types/supabase.ts`).
Confirm the file now contains `lat`, `lng` under `addresses` and `shipping_lat`, `shipping_lng` under `orders`. (`geocode_cache` may also appear — harmless.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/022_address_coordinates.sql types/supabase.ts
git commit -m "feat(db): add lat/lng to addresses and shipping_lat/lng to orders"
```

---

## Task 2: Postal-coordinate endpoint (reuses existing geocoder)

**Files:**
- Create: `app/api/geo/postal-coords/route.ts`

Context: `lib/geo/geocode-destination.ts` already exports `fetchCoordinatesFromPostal(postalCode: string): Promise<{ lat: number; lng: number } | null>` (server-only, cached, robust). The address form needs coordinates to center the map when the user picks an area; the area carries a postal code, so we reuse that function via a thin endpoint. Do NOT create a second geocoder.

- [ ] **Step 1: Write the route**

Create `app/api/geo/postal-coords/route.ts`:

```ts
import { z } from "zod";

import { fetchCoordinatesFromPostal } from "@/lib/geo/geocode-destination";

const schema = z.object({ postalCode: z.string().trim().min(3).max(10) });

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ success: false, error: "Permintaan tidak valid." }, { status: 400 });
    }
    const coords = await fetchCoordinatesFromPostal(parsed.data.postalCode);
    return Response.json({ success: true, data: coords });
  } catch {
    return Response.json({ success: false, error: "Gagal mencari koordinat." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint app/api/geo/postal-coords/route.ts`
Expected: exit 0.

- [ ] **Step 3: Manual smoke test (dev server running)**

With `npm run dev`, run:
```bash
curl -s -X POST http://localhost:3000/api/geo/postal-coords \
  -H 'Content-Type: application/json' -d '{"postalCode":"12740"}'
```
Expected: `{"success":true,"data":{"lat":-6.x,"lng":106.x}}` (coords inside Indonesia). `data` may be `null` if no geocoder key is set AND Nominatim has no hit — acceptable (the form just won't auto-center).

- [ ] **Step 4: Commit**

```bash
git add app/api/geo/postal-coords/route.ts
git commit -m "feat(api): add postal-coords endpoint reusing cached geocoder"
```

---

## Task 3: Address actions accept lat/lng

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

## Task 4: Install Leaflet + LocationPicker component

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

## Task 5: Integrate LocationPicker into the address form

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

- [ ] **Step 3: Fetch coordinates when an area is selected**

Replace the existing `handleAreaSelect` function with this version (keeps the field-fill behavior, adds a postal-coords lookup to recenter the map):

```tsx
  const handleAreaSelect = (area: BiteshipArea) => {
    setProvince(area.administrative_division_level_1_name);
    setCity(area.administrative_division_level_2_name);
    setDistrict(area.administrative_division_level_3_name);
    setPostalCode(String(area.postal_code));

    void (async () => {
      try {
        const res = await fetch("/api/geo/postal-coords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postalCode: String(area.postal_code) }),
        });
        const json = (await res.json()) as { success: boolean; data: LatLng | null };
        if (json.success && json.data) setMapCenter(json.data);
      } catch {
        // centering optional — pin tetap bisa digeser manual
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
          Opsional. Jika tidak diisi, sistem memakai titik dari kode pos otomatis.
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
Expected: the address you just created has non-null `lat`/`lng` (from pin or postal centering).

- [ ] **Step 9: Commit**

```bash
git add components/dashboard/address-form.tsx
git commit -m "feat(addresses): capture coordinates in address form via map picker"
```

---

## Task 6: Snapshot coordinates onto the order at checkout

**Files:**
- Modify: `app/api/checkout/create/route.ts`

- [ ] **Step 1: Add the snapshot fields to the order insert**

In `app/api/checkout/create/route.ts`, the `svc.from("orders").insert({ ... })` call builds the order from `address` (returned by `fetchAddressForUser`, which selects `*`, so `address.lat`/`address.lng` are available). Add these two properties to the insert object, right after `shipping_address: address.full_address,`:

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

## Task 7: Prefer snapshot coordinates at settlement

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
    // Snapshot from the order (most accurate — user pin / map centering).
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

(a) In the `orderFull` select, add `shipping_lat, shipping_lng`. Change:
```ts
        .select("courier_company, courier_service, recipient_name, recipient_phone, shipping_address, shipping_postal")
```
to:
```ts
        .select("courier_company, courier_service, recipient_name, recipient_phone, shipping_address, shipping_postal, shipping_lat, shipping_lng")
```

(b) Update the `resolveOnDemandCoords` call. Change:
```ts
          const onDemandCoords = await resolveOnDemandCoords(orderFull.courier_company, postalNum, storeOrigin);
```
to:
```ts
          const onDemandCoords = await resolveOnDemandCoords(orderFull.courier_company, postalNum, storeOrigin, {
            lat: orderFull.shipping_lat,
            lng: orderFull.shipping_lng,
          });
```

- [ ] **Step 3: Pass snapshot coords in verify-payment**

In `app/api/orders/[id]/verify-payment/route.ts`:

(a) In the `orderFull` select, add `shipping_lat, shipping_lng` (same change as Step 2a — change the same select string).

(b) Update the `resolveOnDemandCoords` call (same change as Step 2b).

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

- New/edited addresses can store a precise pin or auto coordinates from the postal code; coordinates persist in `addresses.lat/lng`.
- Orders snapshot the address coordinates into `orders.shipping_lat/lng` at checkout.
- On-demand (Gojek/Grab) orders are created in Biteship using the snapshot coordinate, with the cached postal-code geocoder as fallback for addresses that have none — no on-demand order is blocked solely by missing coordinates.
- `npx tsc --noEmit` and `npx eslint` pass across all changed files.

## Out of scope

- Backfilling coordinates for existing addresses (the postal fallback covers them).
- Reverse-geocoding a human-readable address from a dropped pin.
