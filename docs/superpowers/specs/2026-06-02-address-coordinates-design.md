# Koordinat Alamat untuk Kurir On-Demand — Design Spec
Date: 2026-06-02

## Overview

Kurir on-demand/instant di Biteship (Gojek/GoSend, GrabExpress, Borzo, dll.) **wajib** menyertakan koordinat lat/lng untuk origin DAN destination saat membuat order (`POST /v1/orders`, field nested `origin_coordinate` / `destination_coordinate`). Kurir reguler (JNE, SiCepat, dll.) cukup kode pos.

Saat ini koordinat destination di-resolve **saat order Biteship dibuat (tahap settlement, setelah pembayaran)** dari kode pos via `lib/biteship/fetch-area-coordinates.ts`. Biteship Areas API tidak mengembalikan koordinat untuk input kode pos, sehingga selalu jatuh ke fallback OpenStreetMap Nominatim. Dua kelemahan:

- **Kurang presisi** — titik = centroid area kode pos, bukan rumah/gedung; driver on-demand bisa diarahkan meleset.
- **Rapuh** — Nominatim rate-limited (~1 req/detik) & tidak ideal untuk produksi.

Tabel `addresses` belum punya kolom koordinat, dan form alamat (`components/dashboard/address-form.tsx`) belum menangkap koordinat sama sekali.

Fitur ini menyimpan koordinat di level alamat user — dengan **pin peta opsional** (Leaflet/OpenStreetMap, gratis) dan **auto-generate titik area** sebagai default — lalu meng-snapshot-nya ke order dan mengirimnya ke Biteship sebagai destination yang akurat. Disertai rantai fallback agar order on-demand tidak pernah gagal hanya karena koordinat.

---

## Keputusan Desain (disetujui)

- **Peta**: Leaflet + react-leaflet (gratis, tanpa Google Maps Platform / tanpa billing).
- **Presisi auto** (jika user tak menggeser pin): centroid area (kecamatan/kota/kode pos); pin hanya untuk koreksi presisi.
- **Penyimpanan**: kolom di `addresses`, lalu **snapshot** ke `orders` (sesuai aturan CLAUDE.md: alamat order disimpan sebagai snapshot, bukan FK).
- **Fallback berlapis** di settlement (snapshot order → resolusi kode pos → input manual admin).

## Non-Tujuan

- Tidak memakai peta/geocoder berbayar.
- Tidak wajib backfill 3.565 alamat lama (ditangani fallback; backfill opsional menyusul).
- Tidak menyelesaikan hardening sumber koordinat destination produksi (di-track sebagai task terpisah yang sudah di-flag).

---

## Scope

| Area | Perubahan |
|------|-----------|
| DB | Tambah `lat`/`lng` ke `addresses`; `shipping_lat`/`shipping_lng` ke `orders` (semua nullable) |
| Komponen baru | `LocationPicker` (peta Leaflet + marker draggable + tombol GPS) |
| Geocode util | `lib/geo/geocode-area.ts` + endpoint `app/api/geo/area-centroid` untuk centroid area |
| Form alamat | Integrasi `LocationPicker`, kirim `lat`/`lng` saat submit |
| Server action alamat | Terima & validasi `lat`/`lng` (range Indonesia atau null) |
| Checkout API | Snapshot `address.lat/lng` → `order.shipping_lat/lng` |
| Settlement (webhook + verify-payment) | Pakai koordinat snapshot sebagai destination; fallback ke resolusi kode pos |
| Types | Regenerate `types/supabase.ts` |

---

## 1. Database Migration

```sql
ALTER TABLE addresses
  ADD COLUMN lat double precision,
  ADD COLUMN lng double precision;

ALTER TABLE orders
  ADD COLUMN shipping_lat double precision,
  ADD COLUMN shipping_lng double precision;
```

- Semua nullable — order/alamat lama tidak terpengaruh.
- `double precision` (bukan text) agar bisa dikirim langsung sebagai number ke Biteship.
- Regenerate `types/supabase.ts` setelah migrasi.

---

## 2. Komponen `LocationPicker` (`components/dashboard/location-picker.tsx`)

- `"use client"`. Leaflet client-only → dynamic import dengan `ssr: false` (Leaflet butuh `window`).
- Props:
  ```ts
  type LatLng = { lat: number; lng: number };
  interface LocationPickerProps {
    value: LatLng | null;
    onChange: (coords: LatLng | null) => void;
    center?: LatLng | null; // dari pilihan area; untuk center awal peta
  }
  ```
- Isi:
  - Peta Leaflet + `Marker` **draggable**; `dragend` → `onChange({lat,lng})`.
  - Klik peta → pindahkan pin → `onChange`.
  - Tombol **"Pakai lokasi saya"** → `navigator.geolocation.getCurrentPosition` → set pin.
- Saat prop `center` berubah (user pilih area baru) dan belum ada pin manual → peta `flyTo(center)` + set marker awal di center.
- Import `leaflet/dist/leaflet.css` (stylesheet bawaan paket — bukan custom CSS).
- Default center bila tak ada koordinat & belum pilih area: Jakarta (`-6.2088, 106.8456`), zoom rendah.

---

## 3. Geocode Centroid Area

**`lib/geo/geocode-area.ts`**
```ts
export async function geocodeAreaCentroid(input: {
  district?: string; city?: string; province?: string; postalCode?: string;
}): Promise<{ lat: number; lng: number } | null>;
```
- Query Nominatim (`format=json&limit=1&country=Indonesia`) dgn string "`<kecamatan>, <kota>, <provinsi>`" → fallback ke kode pos.
- Kirim header `User-Agent` (server-side).

**`app/api/geo/area-centroid/route.ts`** (POST, validasi Zod)
- Body: `{ district?, city?, province?, postalCode? }`. Return `{ success, data: {lat,lng} | null }`.
- Form memanggil endpoint ini (bukan Nominatim langsung) untuk kontrol User-Agent & hindari CORS.
- Catatan: logika ini bersinggungan dengan `fetch-area-coordinates.ts`; refactor minor agar sumber koordinat tidak terduplikasi (selaras dengan hardening task terpisah).

---

## 4. Form Alamat (`components/dashboard/address-form.tsx`)

- Tambah state `lat`, `lng` (number | null), inisialisasi dari `initial?.lat/lng`.
- `handleAreaSelect`: setelah set province/city/district/postal, panggil `/api/geo/area-centroid` → set `center` untuk `LocationPicker` (jika user belum pin manual).
- Render `LocationPicker` di blok tersendiri di bawah field alamat; `onChange` → set lat/lng.
- Payload submit menyertakan `lat`, `lng`.

---

## 5. Server Action Alamat (`app/(dashboard)/dashboard/addresses/_actions.ts`)

- `createAddressAction` / `updateAddressAction`: terima `lat?: number | null`, `lng?: number | null`.
- Validasi: koordinat null **atau** dalam rentang Indonesia (lat −11..6, lng 95..141). Di luar rentang → tolak/abaikan jadi null (jangan hard-block alamat).
- Simpan ke kolom `lat`/`lng`.

---

## 6. Checkout Snapshot (`app/api/checkout/create/route.ts`)

- `fetchAddressForUser` (`lib/data/dashboard-user`) di-extend agar mengembalikan `lat`/`lng`.
- Saat `insert` ke `orders`: `shipping_lat: address.lat ?? null`, `shipping_lng: address.lng ?? null`.

---

## 7. Settlement (webhook + verify-payment)

Kedua jalur (`app/api/webhooks/midtrans/route.ts`, `app/api/orders/[id]/verify-payment/route.ts`):

- Tambah `shipping_lat, shipping_lng` ke `select` order.
- Perluas helper bersama:
  ```ts
  resolveOnDemandCoords(
    courierCompany: string,
    destPostal: number,
    storeOrigin: { lat?: string; lng?: string } | null,
    preferredDest?: { lat: number | null; lng: number | null } | null,
  )
  ```
  - Origin: tetap dari `parseOriginCoords(storeOrigin)`.
  - Destination: jika `preferredDest` (snapshot order) lengkap → pakai itu; else `fetchCoordinatesFromPostal(destPostal)`.
- `createBiteshipOrder` tetap mengirim nested `origin_coordinate` / `destination_coordinate` (sudah diperbaiki sebelumnya).

---

## 8. Alur Data

```
Form alamat (pin / auto centroid / GPS)
        │  lat,lng
        ▼
addresses.lat / addresses.lng
        │  (saat checkout: snapshot)
        ▼
orders.shipping_lat / orders.shipping_lng
        │  (saat settlement)
        ▼
resolveOnDemandCoords → prefer snapshot, else fetchCoordinatesFromPostal
        │
        ▼
createBiteshipOrder → nested origin_coordinate + destination_coordinate → Biteship
```

---

## 9. Error Handling & Edge Cases

- **Leaflet gagal load / koneksi lambat** → peta degrade; koordinat tetap opsional; form tetap bisa submit tanpa koordinat.
- **Izin GPS ditolak** → diabaikan; pakai pin manual / auto centroid.
- **Geocode centroid gagal** → `lat/lng` null; fallback settlement yang menangani.
- **Alamat lama tanpa koordinat** → `shipping_lat/lng` null → settlement fallback ke resolusi kode pos (perilaku sekarang). Order on-demand tetap jalan.
- **Koordinat di luar Indonesia** → warning lembut di form; disimpan null (tidak hard-block).
- **RLS** → kolom baru ikut kebijakan RLS `addresses`/`orders` yang sudah ada (user hanya akses miliknya).

---

## 10. Dependensi

- Baru: `leaflet`, `react-leaflet`, `@types/leaflet`.
- Tanpa API berbayar. Geocode centroid pakai Nominatim (frekuensi rendah — hanya saat isi/simpan alamat).

---

## 11. Testing / Verifikasi

Proyek belum punya framework test → verifikasi manual + script sekali-pakai:

1. Migrasi terpasang (kolom `addresses.lat/lng`, `orders.shipping_lat/lng` ada).
2. Buat alamat **dengan** geser pin → baris `addresses` punya lat/lng sesuai pin.
3. Buat alamat **tanpa** sentuh peta → lat/lng = centroid area (atau null bila geocode gagal).
4. Checkout → `orders.shipping_lat/lng` ter-snapshot dari alamat.
5. Settlement (Biteship test key) untuk Gojek → shipment dibuat memakai koordinat snapshot.
6. Alamat lama (lat/lng null) + Gojek → lewat fallback kode pos → shipment tetap dibuat.

---

## 12. Out of Scope / Follow-up

- Hardening sumber koordinat destination produksi (Biteship `destination_area_id` / geocoder andal) — **task terpisah sudah di-flag**.
- Backfill koordinat untuk 3.565 alamat lama (batch, opsional).
- Places autocomplete berbayar / reverse-geocode alamat dari pin.
