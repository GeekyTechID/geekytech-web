# Perbaikan 6 Blocker Aktivasi Midtrans — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menutup 6 temuan blocker dari [docs/audit-midtrans.md](../../audit-midtrans.md) (Bagian 2, #1–#6) supaya website GeekyTech tidak ditolak/lama diproses saat aktivasi Midtrans.

**Architecture:** Konsolidasi 3 halaman legal (Terms/Privacy/Refund) ke slug Bahasa Indonesia canonical dengan redirect untuk slug lama; buat lapisan `lib/settings/` sebagai sumber data tunggal untuk info bisnis (alamat, WhatsApp CS) yang dibaca dari tabel `settings` yang sudah ada, dipakai bersama oleh admin panel dan halaman publik (footer, contact); perbaiki 2 fallback domain yang salah; investigasi & bersihkan produk seed placeholder di database production dengan gerbang konfirmasi eksplisit.

**Tech Stack:** Next.js 16 App Router + TypeScript (strict), Tailwind v4 (className only, no custom CSS), Supabase (Postgres + RLS) via `@supabase/ssr`. **Tidak ada test runner otomatis di proyek ini** (tidak ada jest/vitest/playwright, tidak ada script `test` di `package.json`) — verifikasi tiap task memakai `npx tsc --noEmit` (type-check), `npx eslint <file yang diubah>` (lint di-scope ke file yang disentuh task, BUKAN `npm run lint` project-wide), dan pengecekan manual di browser lewat `npm run dev`, sesuai aturan proyek di CLAUDE.md ("start dev server dan gunakan fitur di browser sebelum melaporkan task selesai").

**Catatan baseline penting:** `npx tsc --noEmit` bersih di baseline (development branch), tapi `npm run lint` project-wide melaporkan **5384 error & 10223 warning pre-existing**, tersebar di banyak file yang tidak berkaitan dengan plan ini. Ini bukan sesuatu yang harus/bisa diperbaiki di plan ini. Jangan pernah jalankan `npm run lint` tanpa scope sebagai kriteria lulus/gagal task — selalu `npx eslint <path file spesifik yang diubah task ini>` supaya hasilnya bermakna (hanya menunjukkan masalah baru dari perubahan task ini, bukan utang lint lama).

## Global Constraints

- Gunakan path alias `@/` untuk semua import baru.
- Jangan hardcode string penting (URL domain, dsb) — sudah ada masalahnya di Task 2, jangan menambah yang baru.
- Server Component / Server Action pakai `createClient()` dari `@/lib/supabase/server` (respect RLS). Pakai `createServiceClient()` HANYA kalau butuh bypass RLS — tabel `settings` sudah punya policy `settings_select_public` (`USING (true)`), jadi `createClient()` biasa sudah cukup, tidak perlu service role.
- `SUPABASE_SERVICE_ROLE_KEY` tidak pernah dipakai di kode yang bisa diakses client.
- Semua styling lewat `className` Tailwind — jangan menambah file CSS atau `<style>` baru.
- Semua halaman publik baru ditempatkan di bawah `app/(public)/` (route group tanpa perubahan layout, mewarisi navbar/footer/ChatWidget dari `app/(public)/layout.tsx`).
- Ikuti pola data-fetching yang sudah ada di `lib/data/home-storefront.ts`: fungsi `async`, dibungkus `cache()` dari `react`, `try/catch` dengan fallback aman, ditandai `import "server-only"`.

---

## Task 1: Sumber Data Tunggal — Relokasi `StoreOrigin` + Helper Query Settings

**Files:**
- Create: `lib/settings/store-origin.ts` (isi dipindah dari `app/admin/(panel)/settings/shipping/_lib/store-origin.ts`, ditambah 2 helper baru)
- Create: `lib/settings/queries.ts`
- Delete: `app/admin/(panel)/settings/shipping/_lib/store-origin.ts`
- Modify: `app/admin/(panel)/settings/shipping/page.tsx` (update import)
- Modify: `app/admin/(panel)/settings/shipping/_components/origin-form.tsx` (update import)

**Interfaces:**
- Produces: `StoreOrigin` type, `DEFAULT_STORE_ORIGIN`, `parseStoreOrigin(raw: unknown): StoreOrigin`, `getStoreOriginFullAddress(origin: StoreOrigin): string`, `getStoreOriginMapsUrl(origin: StoreOrigin): string` — semua dari `@/lib/settings/store-origin`. `getStoreOrigin(): Promise<StoreOrigin>`, `getWhatsappCs(): Promise<string>` — dari `@/lib/settings/queries`. Task 5 memakai semua fungsi ini.

- [ ] **Step 1: Buat `lib/settings/store-origin.ts`**

Isi persis sama dengan file lama ditambah 2 fungsi helper baru di akhir:

```ts
export type StoreOrigin = {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  postal_code: string;
  address: string;
  /** Origin latitude — required for on-demand couriers (GoSend, Grab, etc.) */
  lat?: string;
  /** Origin longitude — required for on-demand couriers (GoSend, Grab, etc.) */
  lng?: string;
};

export const DEFAULT_STORE_ORIGIN: StoreOrigin = {
  name: "",
  phone: "",
  province: "",
  city: "",
  district: "",
  subdistrict: "",
  postal_code: "",
  address: "",
  lat: "",
  lng: "",
};

export function parseStoreOrigin(raw: unknown): StoreOrigin {
  const partial = (raw ?? {}) as Partial<StoreOrigin>;
  return {
    ...DEFAULT_STORE_ORIGIN,
    ...partial,
    subdistrict: partial.subdistrict ?? "",
    lat: partial.lat ?? "",
    lng: partial.lng ?? "",
  };
}

/** Alamat lengkap satu baris untuk ditampilkan ke publik (footer, contact page). */
export function getStoreOriginFullAddress(origin: StoreOrigin): string {
  return [
    origin.address,
    origin.subdistrict,
    origin.district,
    origin.city,
    origin.province,
    origin.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

/** URL Google Maps — pakai koordinat kalau ada, fallback ke pencarian teks alamat. */
export function getStoreOriginMapsUrl(origin: StoreOrigin): string {
  if (origin.lat && origin.lng) {
    return `https://www.google.com/maps?q=${origin.lat},${origin.lng}`;
  }
  const fullAddress = getStoreOriginFullAddress(origin);
  const query = fullAddress || origin.name || "GeekyTech";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
```

- [ ] **Step 2: Buat `lib/settings/queries.ts`**

```ts
import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_STORE_ORIGIN, parseStoreOrigin, type StoreOrigin } from "./store-origin";

export const getStoreOrigin = cache(async (): Promise<StoreOrigin> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "store_origin")
      .maybeSingle();
    return parseStoreOrigin(data?.value);
  } catch {
    return DEFAULT_STORE_ORIGIN;
  }
});

export const getWhatsappCs = cache(async (): Promise<string> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "whatsapp_cs")
      .maybeSingle();
    return typeof data?.value === "string" ? data.value : "";
  } catch {
    return "";
  }
});
```

- [ ] **Step 3: Hapus file lama**

Hapus `app/admin/(panel)/settings/shipping/_lib/store-origin.ts` (isinya sudah dipindah persis ke Step 1, tidak ada logic yang hilang).

- [ ] **Step 4: Update import di `app/admin/(panel)/settings/shipping/page.tsx`**

Old:
```ts
import { parseStoreOrigin } from "./_lib/store-origin";
```

New:
```ts
import { parseStoreOrigin } from "@/lib/settings/store-origin";
```

- [ ] **Step 5: Update import di `app/admin/(panel)/settings/shipping/_components/origin-form.tsx`**

Old:
```ts
import type { StoreOrigin } from "../_lib/store-origin";
```

New:
```ts
import type { StoreOrigin } from "@/lib/settings/store-origin";
```

- [ ] **Step 6: Verifikasi type-check**

Run: `npx tsc --noEmit`
Expected: tidak ada error terkait `store-origin` atau import yang putus (kalau ada error lain yang sudah ada sebelumnya di codebase, itu di luar scope task ini — fokus hanya pastikan tidak ADA error baru dari perubahan ini).

- [ ] **Step 7: Verifikasi manual admin masih berfungsi**

Run: `npm run dev`, buka `http://localhost:3000/admin/settings/shipping` (login admin dulu kalau perlu).
Expected: form "Alamat Origin Toko" tetap tampil terisi seperti sebelumnya, tombol "Simpan" tetap berfungsi (tidak ada error di console).

- [ ] **Step 8: Commit**

```bash
git add lib/settings/store-origin.ts lib/settings/queries.ts "app/admin/(panel)/settings/shipping/page.tsx" "app/admin/(panel)/settings/shipping/_components/origin-form.tsx"
git rm "app/admin/(panel)/settings/shipping/_lib/store-origin.ts"
git commit -m "refactor: pindahkan StoreOrigin ke lib/settings, tambah query helper untuk halaman publik"
```

---

## Task 2: Perbaikan Fallback Domain (Blocker #5)

**Files:**
- Modify: `app/layout.tsx:29-31`
- Modify: `lib/email/resend.ts:4,7`

**Interfaces:** Tidak ada — perubahan nilai literal saja, tidak mengubah signature apapun.

- [ ] **Step 1: Perbaiki `app/layout.tsx`**

Old:
```ts
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://geekytech.com",
  ),
```

New:
```ts
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://geeky.id",
  ),
```

- [ ] **Step 2: Perbaiki `lib/email/resend.ts`**

Old:
```ts
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@geekytech.com";
export const FROM_NAME = process.env.RESEND_FROM_NAME ?? "GeekyTech";
export const FROM = `${FROM_NAME} <${FROM_EMAIL}>`;
export const ADMIN_EMAIL = process.env.RESEND_ADMIN_EMAIL ?? "admin@geekytech.com";
```

New:
```ts
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@geeky.id";
export const FROM_NAME = process.env.RESEND_FROM_NAME ?? "GeekyTech";
export const FROM = `${FROM_NAME} <${FROM_EMAIL}>`;
export const ADMIN_EMAIL = process.env.RESEND_ADMIN_EMAIL ?? "admin@geeky.id";
```

- [ ] **Step 3: Pastikan tidak ada fallback `geekytech.com` yang tersisa**

Run: `grep -rn "geekytech.com" --include="*.ts" --include="*.tsx" app lib components`
Expected: tidak ada hasil (output kosong).

- [ ] **Step 4: Verifikasi type-check**

Run: `npx tsc --noEmit`
Expected: tidak ada error baru.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx lib/email/resend.ts
git commit -m "fix: perbaiki fallback domain geekytech.com ke geeky.id (domain live)"
```

---

## Task 3: Konsolidasi Routing Halaman Legal — Terms & Privacy (Blocker #1, #2)

**Files:**
- Create: `app/(public)/kebijakan-privasi/page.tsx` (isi dipindah dari `app/(public)/privacy/page.tsx`, tanpa perubahan konten)
- Delete: `app/(public)/privacy/page.tsx`
- Delete: `app/(public)/terms/page.tsx`
- Delete: `components/layout/footer.tsx` (dead code, tidak pernah di-import, berisi link 404 ke `/returns`, `/cara-belanja`, `/cookies`)
- Modify: `app/(public)/syarat-ketentuan/page.tsx:141,159` (hapus class CSS nyasar)
- Modify: `next.config.ts` (tambah `redirects()`)
- Modify: `components/store/store-footer.tsx` (update 2 href di `FOOTER_DISCOVER`)
- Modify: `components/auth/register-form.tsx:265,269` (update 2 href)

**Interfaces:** Tidak ada — murni routing & link, tidak ada fungsi baru.

- [ ] **Step 1: Pindahkan `privacy` → `kebijakan-privasi`**

Buat `app/(public)/kebijakan-privasi/page.tsx` dengan isi **identik 100%** dengan `app/(public)/privacy/page.tsx` saat ini (232 baris, komponen `PrivacyPage`, array `sections` 12 item, hero + content + related links). Tidak ada satu karakter pun yang berubah — ini murni pemindahan lokasi file.

Setelah file baru dibuat dan isinya dikonfirmasi identik, hapus `app/(public)/privacy/page.tsx`.

- [ ] **Step 2: Hapus `app/(public)/terms/page.tsx`**

Dikonfirmasi sebelumnya via `diff` terhadap `syarat-ketentuan/page.tsx`: isinya 99% identik (beda hanya title meta berbahasa Inggris dan 2 href yang justru salah di file ini). Tidak ada konten unik yang hilang. Hapus filenya beserta foldernya.

- [ ] **Step 3: Perbaiki 2 class CSS nyasar di `app/(public)/syarat-ketentuan/page.tsx`**

Old (baris 141):
```tsx
      <section className="bg-red-500 w-full px-6 py-20 md:pt-[80px] md:pb-0 text-center bg-white">
```

New:
```tsx
      <section className="w-full px-6 py-20 md:pt-[80px] md:pb-0 text-center bg-white">
```

Old (baris 159):
```tsx
      <section className="bg-blue-500 w-full px-6 bg-white">
```

New:
```tsx
      <section className="w-full px-6 bg-white">
```

- [ ] **Step 4: Tambah redirect permanen di `next.config.ts`**

Old:
```ts
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["lightningcss"],
  // Dev pakai `next dev --webpack` — bundler Turbopack default sering bentrok dengan lightningcss (Tailwind v4).
  webpack: (config) => {
    config.externals = [...(config.externals ?? []), "lightningcss"];
    return config;
  },
  images: {
```

New:
```ts
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["lightningcss"],
  // Dev pakai `next dev --webpack` — bundler Turbopack default sering bentrok dengan lightningcss (Tailwind v4).
  webpack: (config) => {
    config.externals = [...(config.externals ?? []), "lightningcss"];
    return config;
  },
  async redirects() {
    return [
      { source: "/terms", destination: "/syarat-ketentuan", permanent: true },
      { source: "/privacy", destination: "/kebijakan-privasi", permanent: true },
    ];
  },
  images: {
```

- [ ] **Step 5: Update `FOOTER_DISCOVER` di `components/store/store-footer.tsx`**

Old:
```tsx
const FOOTER_DISCOVER = [
  { label: "Tentang kami", href: "/about" },
  { label: "Kontak", href: "/contact" },
  { label: "Syarat & Ketentuan", href: "/terms" },
  { label: "FAQ", href: "/faq" },
  { label: "Kebijakan privasi", href: "/privacy" },
] as const;
```

New:
```tsx
const FOOTER_DISCOVER = [
  { label: "Tentang kami", href: "/about" },
  { label: "Kontak", href: "/contact" },
  { label: "Syarat & Ketentuan", href: "/syarat-ketentuan" },
  { label: "FAQ", href: "/faq" },
  { label: "Kebijakan privasi", href: "/kebijakan-privasi" },
] as const;
```

- [ ] **Step 6: Update link di `components/auth/register-form.tsx`**

Old (baris 264-271):
```tsx
          Dengan mendaftar, kamu setuju dengan{" "}
          <Link href="/terms" className="text-[#EA5329] underline-offset-2 hover:underline">
            Syarat & Ketentuan
          </Link>{" "}
          dan{" "}
          <Link href="/privacy" className="text-[#EA5329] underline-offset-2 hover:underline">
            Kebijakan Privasi
          </Link>{" "}
```

New:
```tsx
          Dengan mendaftar, kamu setuju dengan{" "}
          <Link href="/syarat-ketentuan" className="text-[#EA5329] underline-offset-2 hover:underline">
            Syarat & Ketentuan
          </Link>{" "}
          dan{" "}
          <Link href="/kebijakan-privasi" className="text-[#EA5329] underline-offset-2 hover:underline">
            Kebijakan Privasi
          </Link>{" "}
```

- [ ] **Step 7: Hapus dead code `components/layout/footer.tsx`**

Dikonfirmasi via grep di seluruh repo: file ini tidak pernah di-`import`. Hapus filenya.

Run cek ulang sebelum hapus: `grep -rn "layout/footer" --include="*.ts" --include="*.tsx" app components`
Expected: tidak ada hasil (kalau ada hasil, JANGAN hapus — investigasi dulu kenapa masih dipakai).

- [ ] **Step 8: Verifikasi type-check & lint**

Run: `npx tsc --noEmit && npx eslint "app/(public)/kebijakan-privasi/page.tsx" "app/(public)/syarat-ketentuan/page.tsx" next.config.ts components/store/store-footer.tsx components/auth/register-form.tsx`
Expected: tidak ada error baru dari file-file ini (baseline project punya ribuan lint error pre-existing di file lain — abaikan, itu di luar scope task ini; fokus hanya pada file yang disebut di perintah ini).

- [ ] **Step 9: Verifikasi manual di browser**

Run: `npm run dev`, lalu cek satu per satu:
- Buka `http://localhost:3000/syarat-ketentuan` — dua section pertama (Hero, Content) harus berlatar putih normal, TIDAK ada background merah/biru terang.
- Buka `http://localhost:3000/kebijakan-privasi` — halaman tampil normal (isinya sama seperti `/privacy` sebelumnya).
- Buka `http://localhost:3000/terms` — harus redirect otomatis ke `/syarat-ketentuan`.
- Buka `http://localhost:3000/privacy` — harus redirect otomatis ke `/kebijakan-privasi`.
- Buka `http://localhost:3000/register` — link "Syarat & Ketentuan" dan "Kebijakan Privasi" di bawah form mengarah ke slug baru (hover, cek status bar / inspect href).
- Scroll ke footer di halaman manapun — link "Syarat & Ketentuan" dan "Kebijakan privasi" mengarah ke slug baru.

- [ ] **Step 10: Commit**

```bash
git add "app/(public)/kebijakan-privasi" "app/(public)/syarat-ketentuan/page.tsx" next.config.ts components/store/store-footer.tsx components/auth/register-form.tsx
git rm -r "app/(public)/privacy" "app/(public)/terms" components/layout/footer.tsx
git commit -m "fix: konsolidasi routing halaman legal ke slug Indonesia + hapus footer mati"
```

---

## Task 4: Halaman Kebijakan Pengembalian Baru (Blocker #1)

**Files:**
- Create: `app/(public)/kebijakan-pengembalian/page.tsx`
- Modify: `app/(public)/syarat-ketentuan/page.tsx` (persingkat section 7)
- Modify: `components/store/store-footer.tsx` (tambah 1 entri `FOOTER_DISCOVER`)

**Interfaces:** Tidak ada — halaman statis baru, tidak ada fungsi yang dikonsumsi task lain.

- [ ] **Step 1: Buat `app/(public)/kebijakan-pengembalian/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Kebijakan Pengembalian",
  description:
    "Kebijakan pengembalian dan penukaran barang GeekyTech. Pelajari syarat, cara pengajuan, dan estimasi waktu pengembalian dana.",
};

const sections = [
  {
    title: "1. Syarat Pengembalian Barang",
    content: [
      "GeekyTech menyediakan kebijakan pengembalian gratis dalam waktu 7 hari sejak barang diterima, dengan syarat barang dalam kondisi original, belum digunakan, dan kelengkapan (dus, aksesori, kartu garansi) masih utuh.",
      "Pengembalian karena kecacatan pabrik dapat diajukan kapan saja selama garansi resmi produk masih berlaku, tanpa batas waktu 7 hari di atas.",
      "Barang yang dikembalikan karena tidak sesuai pesanan (salah warna/varian yang dikirim oleh GeekyTech) mengikuti syarat yang sama seperti kecacatan pabrik.",
    ],
  },
  {
    title: "2. Barang yang Tidak Dapat Dikembalikan",
    content: [
      "Barang yang sudah digunakan, dipasang, atau menunjukkan tanda pemakaian di luar untuk keperluan pengecekan awal.",
      "Barang dengan segel/garansi yang sudah rusak akibat pembukaan yang tidak wajar, kecuali kerusakan tersebut adalah bagian dari cacat pabrik yang diklaim.",
      "Kerusakan yang timbul akibat kesalahan penggunaan, kecelakaan, atau modifikasi oleh pembeli setelah barang diterima.",
      "Produk yang dibeli dalam kategori kebutuhan khusus atau pre-order dengan ketentuan tertulis berbeda saat pemesanan.",
    ],
  },
  {
    title: "3. Cara Mengajukan Pengembalian",
    content: [
      "Hubungi customer service GeekyTech melalui halaman Kontak selambat-lambatnya 7 hari sejak barang diterima, sertakan nomor pesanan dan foto/video kondisi barang.",
      "Tim kami akan memverifikasi pengajuan dan mengirimkan instruksi pengiriman balik (termasuk alamat tujuan retur) melalui email atau WhatsApp.",
      "Kemas barang beserta seluruh kelengkapannya, lalu kirim menggunakan kurir yang diinstruksikan oleh tim kami.",
    ],
  },
  {
    title: "4. Proses Verifikasi dan Biaya Pengiriman Balik",
    content: [
      "Setelah barang retur diterima, tim kami akan melakukan verifikasi kondisi barang dalam waktu 2-3 hari kerja.",
      "Biaya pengiriman balik ditanggung oleh GeekyTech jika pengembalian disebabkan oleh kecacatan pabrik atau kesalahan pengiriman dari pihak kami.",
      "Biaya pengiriman balik ditanggung oleh pembeli jika pengembalian disebabkan oleh alasan di luar cacat pabrik/kesalahan pengiriman (misal berubah pikiran), sepanjang barang masih memenuhi syarat pada bagian 1.",
    ],
  },
  {
    title: "5. Estimasi Waktu Pengembalian Dana",
    content: [
      "Dana akan dikembalikan dalam waktu 5-7 hari kerja setelah barang retur diterima dan lolos verifikasi.",
      "Pengembalian dana dilakukan melalui metode pembayaran yang sama dengan metode pembayaran saat transaksi berlangsung.",
      "Untuk transaksi yang belum melewati status pembayaran berhasil (settlement), pembatalan pesanan tidak memerlukan proses retur fisik — dana otomatis tidak terpotong.",
    ],
  },
  {
    title: "6. Penukaran Barang",
    content: [
      "Penukaran varian (misal ukuran, warna) hanya dapat dilakukan jika stok varian yang diminta tersedia, dan mengikuti syarat kondisi barang pada bagian 1.",
      "Jika terjadi selisih harga antara barang lama dan barang pengganti, selisih akan ditagihkan atau dikembalikan sesuai kondisi.",
      "Proses penukaran mengikuti alur pengajuan yang sama seperti pengembalian pada bagian 3.",
    ],
  },
  {
    title: "7. Hubungi Kami",
    content: [
      "Untuk pertanyaan atau pengajuan pengembalian, silakan hubungi kami melalui:",
      "Email: support@geekytech.com",
      "WhatsApp: +62 812-3456-7890",
      "Jam operasional: Senin - Minggu, 09:00 - 21:00",
    ],
  },
];

export default function KebijakanPengembalianPage() {
  return (
    <div className="bg-white">
      {/* Hero — light tile */}
      <section className="w-full px-6 py-20 md:pt-[80px] md:pb-0 text-center bg-white">
        <div className="mx-auto max-w-[980px]">
          <p className="text-[14px] font-semibold text-[#EA5329] mb-4">
            Legal
          </p>
          <h1 className="text-[28px] sm:text-[40px] lg:text-[56px] font-semibold leading-[1.07] text-[#1d1d1f] mb-6">
            Kebijakan Pengembalian
          </h1>
          <p className="text-[17px] font-light leading-[1.5] text-[#1d1d1f] max-w-[600px] mx-auto mb-8">
            Pelajari syarat, cara pengajuan, dan estimasi waktu pengembalian dana untuk barang yang kamu beli di GeekyTech.
          </p>
          <p className="text-[14px] text-[#7a7a7a]">
            Terakhir diperbarui: 13 Mei 2026
          </p>
        </div>
      </section>

      {/* Content — light tile */}
      <section className="w-full px-6 bg-white">
        <div className="mx-auto max-w-[980px]">
          <div className="prose prose-invert max-w-none">
            {sections.map((section, idx) => (
              <div key={idx} className="mb-12 last:mb-0">
                <h2 className="text-[21px] font-semibold leading-[1.19] text-[#1d1d1f] mb-4">
                  {section.title}
                </h2>
                <div className="space-y-4">
                  {section.content.map((text, contentIdx) => (
                    <p
                      key={contentIdx}
                      className="text-[17px] font-normal leading-[1.47] text-[#1d1d1f]"
                    >
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {/* Final CTA */}
            <div className="mt-[80px] pt-[80px] border-t border-[#e0e0e0] text-center">
              <h3 className="text-[21px] font-semibold leading-[1.19] text-[#1d1d1f] mb-4">
                Ingin mengajukan pengembalian barang?
              </h3>
              <p className="text-[17px] font-normal leading-[1.47] text-[#7a7a7a] mb-6">
                Hubungi tim customer service kami dan kami akan bantu proses pengajuannya.
              </p>
              <Button asChild variant="primary">
                <Link href="/contact">Hubungi Customer Service</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Related Links — parchment tile */}
      <section className="w-full px-6 py-[80px] bg-[#f5f5f7]">
        <div className="mx-auto max-w-[980px]">
          <div className="text-center mb-12">
            <h2 className="text-[34px] font-semibold leading-[1.1] text-[#1d1d1f]">
              Dokumen Legal Lainnya
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-[800px] mx-auto">
            {[
              {
                title: "Syarat & Ketentuan",
                desc: "Ketentuan penggunaan platform GeekyTech.",
                href: "/syarat-ketentuan",
              },
              {
                title: "Kebijakan Privasi",
                desc: "Bagaimana kami menggunakan dan melindungi data pribadi Anda.",
                href: "/kebijakan-privasi",
              },
              {
                title: "Hubungi Kami",
                desc: "Ada pertanyaan? Hubungi tim support kami sekarang.",
                href: "/contact",
              },
            ].map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                className="bg-white rounded-[18px] border border-[#e0e0e0] p-6 hover:border-[#EA5329] transition-colors"
              >
                <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-2">
                  {link.title}
                </h3>
                <p className="text-[14px] text-[#7a7a7a]">
                  {link.desc}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Persingkat section 7 di `app/(public)/syarat-ketentuan/page.tsx`**

Old:
```tsx
  {
    title: "7. Pengembalian dan Penukaran",
    content: [
      "GeekyTech menyediakan kebijakan pengembalian gratis dalam waktu 7 hari setelah barang sampai, dengan syarat barang dalam kondisi original dan belum digunakan.",
      "Pengembalian karena kecacatan pabrik dapat dilakukan kapan saja selama garansi resmi masih berlaku.",
      "Untuk mengajukan pengembalian, hubungi customer service kami dan ikuti proses yang telah ditentukan.",
      "Biaya pengembalian ditanggung oleh GeekyTech jika pengembalian disebabkan oleh kecacatan pabrik atau barang tidak sesuai pesanan.",
      "Dana pengembalian akan diproses dalam waktu 5-7 hari kerja setelah barang retur diterima dan diverifikasi.",
    ],
  },
```

New:
```tsx
  {
    title: "7. Pengembalian dan Penukaran",
    content: [
      "GeekyTech menyediakan kebijakan pengembalian gratis dalam waktu 7 hari setelah barang sampai, dengan syarat barang dalam kondisi original dan belum digunakan.",
      "Pengembalian karena kecacatan pabrik dapat dilakukan kapan saja selama garansi resmi masih berlaku.",
      "Ketentuan lengkap mengenai syarat, cara pengajuan, dan estimasi waktu pengembalian dana dijelaskan secara rinci di halaman Kebijakan Pengembalian.",
    ],
  },
```

- [ ] **Step 3: Tambah entri "Kebijakan pengembalian" di `FOOTER_DISCOVER`, `components/store/store-footer.tsx`**

Old:
```tsx
const FOOTER_DISCOVER = [
  { label: "Tentang kami", href: "/about" },
  { label: "Kontak", href: "/contact" },
  { label: "Syarat & Ketentuan", href: "/syarat-ketentuan" },
  { label: "FAQ", href: "/faq" },
  { label: "Kebijakan privasi", href: "/kebijakan-privasi" },
] as const;
```

New:
```tsx
const FOOTER_DISCOVER = [
  { label: "Tentang kami", href: "/about" },
  { label: "Kontak", href: "/contact" },
  { label: "Syarat & Ketentuan", href: "/syarat-ketentuan" },
  { label: "FAQ", href: "/faq" },
  { label: "Kebijakan privasi", href: "/kebijakan-privasi" },
  { label: "Kebijakan pengembalian", href: "/kebijakan-pengembalian" },
] as const;
```

- [ ] **Step 4: Verifikasi type-check & lint**

Run: `npx tsc --noEmit && npx eslint "app/(public)/kebijakan-pengembalian/page.tsx" "app/(public)/syarat-ketentuan/page.tsx" components/store/store-footer.tsx`
Expected: tidak ada error baru dari file-file ini (abaikan lint error pre-existing di file lain, di luar scope task ini).

- [ ] **Step 5: Verifikasi manual di browser**

Run: `npm run dev`, lalu cek:
- Buka `http://localhost:3000/kebijakan-pengembalian` — halaman tampil lengkap (hero, 7 section, CTA, related links), tidak ada broken image/link.
- Buka `http://localhost:3000/syarat-ketentuan` — scroll ke section 7, sekarang lebih ringkas (3 paragraf, bukan 5) dan kartu "Kebijakan Pengembalian" di bagian "Dokumen Legal Lainnya" (bawah halaman) sekarang bisa diklik dan tidak 404.
- Buka `http://localhost:3000/kebijakan-privasi` — kartu "Kebijakan Pengembalian" di bagian bawah halaman ini juga sudah tidak 404.
- Scroll ke footer di halaman manapun — ada link baru "Kebijakan pengembalian" yang mengarah ke halaman baru ini.

- [ ] **Step 6: Commit**

```bash
git add "app/(public)/kebijakan-pengembalian" "app/(public)/syarat-ketentuan/page.tsx" components/store/store-footer.tsx
git commit -m "feat: tambah halaman Kebijakan Pengembalian, tutup semua link 404 di halaman legal"
```

---

## Task 5: Info Bisnis Dinamis di Footer & Contact Page (Blocker #3, #4)

**Files:**
- Modify: `components/store/store-footer.tsx` (tambah blok alamat + WA)
- Modify: `app/(public)/contact/page.tsx` (jadi async, field Lokasi & WhatsApp dinamis)

**Interfaces:**
- Consumes: `getStoreOrigin(): Promise<StoreOrigin>`, `getWhatsappCs(): Promise<string>` dari `@/lib/settings/queries` (Task 1); `getStoreOriginFullAddress(origin): string`, `getStoreOriginMapsUrl(origin): string` dari `@/lib/settings/store-origin` (Task 1).

- [ ] **Step 1: Tambah import & fetch data di `components/store/store-footer.tsx`**

Old:
```tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchShopBrands } from "@/lib/data/home-storefront";
```

New:
```tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchShopBrands } from "@/lib/data/home-storefront";
import { getStoreOrigin, getWhatsappCs } from "@/lib/settings/queries";
import { getStoreOriginFullAddress } from "@/lib/settings/store-origin";
```

Old:
```tsx
export async function StoreFooter() {
  const brands = await fetchShopBrands();
  const year = new Date().getFullYear();
```

New:
```tsx
export async function StoreFooter() {
  const [brands, storeOrigin, whatsappCs] = await Promise.all([
    fetchShopBrands(),
    getStoreOrigin(),
    getWhatsappCs(),
  ]);
  const year = new Date().getFullYear();
  const fullAddress = getStoreOriginFullAddress(storeOrigin);
```

- [ ] **Step 2: Tambah blok alamat + WA di bawah copyright**

Old:
```tsx
            <p className="relative z-10 mt-14 text-xs text-white/45">
              © {year} GeekyTech by CV. Sentosa Berkat Jaya. All rights reserved.
            </p>
          </div>
```

New:
```tsx
            <div className="relative z-10 mt-14 space-y-1.5 text-xs text-white/45">
              <p>© {year} GeekyTech by CV. Sentosa Berkat Jaya. All rights reserved.</p>
              {fullAddress && <p>{fullAddress}</p>}
              {whatsappCs && (
                <p>
                  WhatsApp:{" "}
                  <a
                    href={`https://wa.me/${whatsappCs}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:text-white hover:underline"
                  >
                    +{whatsappCs}
                  </a>
                </p>
              )}
            </div>
          </div>
```

- [ ] **Step 3: Ubah `app/(public)/contact/page.tsx` jadi async dan pakai data dinamis**

Old (baris 1-44):
```tsx
import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";
import { MessageCircle, Mail, MapPin, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Hubungi Kami",
  description:
    "Hubungi tim GeekyTech untuk konsultasi produk, pertanyaan pesanan, atau keluhan. Kami siap membantu 24/7.",
};

const contactChannels = [
  {
    icon: MessageCircle,
    title: "WhatsApp",
    description: "Chat langsung dengan tim kami",
    value: "+62 812-3456-7890",
    href: "https://wa.me/6281234567890",
    label: "Buka WhatsApp",
  },
  {
    icon: Mail,
    title: "Email",
    description: "Kirim email pertanyaanmu",
    value: "support@geekytech.com",
    href: "mailto:support@geekytech.com",
    label: "Kirim Email",
  },
  {
    icon: MapPin,
    title: "Lokasi",
    description: "Kunjungi showroom kami",
    value: "Jakarta Selatan, Indonesia",
    href: "#",
    label: "Lihat Peta",
  },
  {
    icon: Clock,
    title: "Jam Operasional",
    description: "Kami siap melayani",
    value: "Senin - Minggu, 09:00 - 21:00",
    href: "#",
    label: "Hubungi Sekarang",
  },
];

export default function ContactPage() {
```

New:
```tsx
import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";
import { MessageCircle, Mail, MapPin, Clock } from "lucide-react";
import { getStoreOrigin, getWhatsappCs } from "@/lib/settings/queries";
import { getStoreOriginFullAddress, getStoreOriginMapsUrl } from "@/lib/settings/store-origin";

export const metadata: Metadata = {
  title: "Hubungi Kami",
  description:
    "Hubungi tim GeekyTech untuk konsultasi produk, pertanyaan pesanan, atau keluhan. Kami siap membantu 24/7.",
};

export default async function ContactPage() {
  const [storeOrigin, whatsappCs] = await Promise.all([getStoreOrigin(), getWhatsappCs()]);
  const fullAddress = getStoreOriginFullAddress(storeOrigin);

  const contactChannels = [
    {
      icon: MessageCircle,
      title: "WhatsApp",
      description: "Chat langsung dengan tim kami",
      value: whatsappCs ? `+${whatsappCs}` : "Belum diatur",
      href: whatsappCs ? `https://wa.me/${whatsappCs}` : "#",
      label: "Buka WhatsApp",
    },
    {
      icon: Mail,
      title: "Email",
      description: "Kirim email pertanyaanmu",
      value: "support@geekytech.com",
      href: "mailto:support@geekytech.com",
      label: "Kirim Email",
    },
    {
      icon: MapPin,
      title: "Lokasi",
      description: "Kunjungi showroom kami",
      value: fullAddress || "Belum diatur",
      href: getStoreOriginMapsUrl(storeOrigin),
      label: "Lihat Peta",
    },
    {
      icon: Clock,
      title: "Jam Operasional",
      description: "Kami siap melayani",
      value: "Senin - Minggu, 09:00 - 21:00",
      href: "#",
      label: "Hubungi Sekarang",
    },
  ];

```

Catatan: baris `export default function ContactPage() {` yang lama dihapus (digantikan `export default async function ContactPage() {` di atas beserta body barunya). Sisa body function (bagian JSX `return (...)`) di bawahnya **tidak berubah** — `contactChannels` yang dipakai di JSX sekarang adalah variabel lokal hasil komputasi di atas, bukan lagi konstanta module-level, tapi nama & shape-nya identik sehingga JSX yang me-render `.map((channel) => ...)` tetap jalan tanpa perubahan.

- [ ] **Step 4: Verifikasi type-check & lint**

Run: `npx tsc --noEmit && npx eslint components/store/store-footer.tsx "app/(public)/contact/page.tsx"`
Expected: tidak ada error baru dari 2 file ini (abaikan lint error pre-existing di file lain, di luar scope task ini). Perhatikan: `contactChannels` sekarang dideklarasikan di dalam function, pastikan tidak ada duplicate/shadow declaration tersisa dari kode lama.

- [ ] **Step 5: Verifikasi manual di browser**

Prasyarat: pastikan ada baris `settings` dengan `key = 'store_origin'` dan `key = 'whatsapp_cs'` di database (development) — kalau belum ada, isi dulu lewat `/admin/settings/shipping` (alamat) dan `/admin/settings` (WhatsApp CS) supaya tidak menampilkan "Belum diatur".

Run: `npm run dev`, lalu cek:
- Buka `http://localhost:3000/contact` — kartu "Lokasi" menampilkan alamat lengkap dari settings (bukan lagi "Jakarta Selatan, Indonesia" hardcode), tombol "Lihat Peta" membuka Google Maps yang benar di tab baru. Kartu "WhatsApp" menampilkan nomor dari settings.
- Scroll ke footer — muncul alamat & link WhatsApp di bawah baris copyright, sesuai data settings yang sama dengan halaman contact.
- Test kondisi kosong: hapus sementara isi setting `whatsapp_cs` (set jadi string kosong) lewat admin, reload `/contact` — pastikan kartu WhatsApp menampilkan "Belum diatur" dan tidak crash. Kembalikan nilainya setelah test.

- [ ] **Step 6: Commit**

```bash
git add components/store/store-footer.tsx "app/(public)/contact/page.tsx"
git commit -m "feat: tampilkan alamat & WhatsApp dari settings di footer dan contact page"
```

---

## Task 6: Investigasi & Cleanup Produk Seed Placeholder (Blocker #6)

**Files:** Tidak ada file kode yang diubah — task ini murni operasi data di Supabase production, dieksekusi lewat MCP Supabase (`execute_sql`) yang tersedia di sesi ini.

**Interfaces:** Tidak ada.

⚠️ Ini satu-satunya task yang menyentuh data production. Ikuti urutan step dengan tepat — jangan lompat ke Step 3 tanpa hasil Step 1-2 dan konfirmasi eksplisit dari user.

- [ ] **Step 0: Pastikan target project Supabase benar**

Jalankan `list_projects` lewat MCP Supabase, cocokkan nama/ref project dengan project production GeekyTech yang sebenarnya dipakai (bukan project percobaan/staging lain kalau ada lebih dari satu). Kalau ragu, tanyakan ke user project ref mana yang dimaksud sebelum lanjut — jangan menebak.

- [ ] **Step 1: Query identifikasi — cari produk dengan gambar `placehold.co`**

Jalankan lewat Supabase MCP (`execute_sql`) ke project production:

```sql
select
  p.id,
  p.name,
  p.slug,
  p.is_active,
  pi.url as placeholder_image_url,
  (
    select count(*)
    from order_items oi
    join product_variants pv on pv.id = oi.variant_id
    where pv.product_id = p.id
  ) as order_count
from products p
join product_images pi on pi.product_id = p.id
where pi.url ilike '%placehold.co%'
order by p.name;
```

Catatan teknis penting: `order_items` **tidak punya kolom `product_id`** langsung — relasinya lewat `order_items.variant_id → product_variants.id → product_variants.product_id`. Query di atas sudah menyesuaikan lewat join tersebut (dikonfirmasi dari `supabase/migrations/001_schema.sql`).

- [ ] **Step 2: Laporkan hasil ke user, kelompokkan berdasarkan `order_count`**

- Produk dengan `order_count = 0` → kandidat aman untuk dinonaktifkan (kemungkinan besar murni data seed dari `006_seed_products.sql`, tidak pernah benar-benar terjual).
- Produk dengan `order_count > 0` → **JANGAN dinonaktifkan**. Ini tandanya produk asli yang kebetulan foto utamanya masih placeholder — laporkan terpisah ke user sebagai "perlu ganti foto", bukan "perlu nonaktifkan produk".

Tampilkan tabel hasil lengkap ke user dan **tunggu konfirmasi eksplisit** sebelum lanjut ke Step 3.

- [ ] **Step 3: Setelah dikonfirmasi user — nonaktifkan produk seed murni (bukan DELETE)**

```sql
update products
set is_active = false
where id in (
  select p.id
  from products p
  join product_images pi on pi.product_id = p.id
  where pi.url ilike '%placehold.co%'
)
and not exists (
  select 1
  from order_items oi
  join product_variants pv on pv.id = oi.variant_id
  where pv.product_id = products.id
);
```

Reversibel: kalau ternyata ada yang salah nonaktifkan, tinggal `update products set is_active = true where id = '<id>'`.

- [ ] **Step 4: Verifikasi hasil**

Jalankan ulang query Step 1 (tanpa filter `order_count`) untuk konfirmasi:

```sql
select p.id, p.name, p.is_active
from products p
join product_images pi on pi.product_id = p.id
where pi.url ilike '%placehold.co%'
order by p.name;
```

Expected: semua baris dengan `order_count = 0` di Step 1 sekarang punya `is_active = false`; baris dengan `order_count > 0` (kalau ada) tetap `is_active = true` (tidak tersentuh).

Laporkan ringkasan akhir ke user: berapa produk dinonaktifkan, berapa yang di-skip karena punya order asli (dengan daftar nama produknya supaya user tahu mana yang perlu ganti foto).

- [ ] **Step 5: Cek katalog publik**

Run: `npm run dev`, buka `http://localhost:3000/products` — pastikan produk yang baru dinonaktifkan sudah tidak muncul di listing publik (tergantung apakah query listing sudah filter `is_active = true` — kalau di local dev datanya beda dari production, cukup pastikan tidak ada error, verifikasi utama tetap lewat query Step 4 di database production).

Tidak ada commit git untuk task ini (tidak ada perubahan kode).

---

## Self-Review Notes

- **Spec coverage**: Task 1↔§B(infra), Task 2↔§C, Task 3+4↔§A, Task 5↔§B(UI), Task 6↔§D — semua bagian spec [2026-07-02-midtrans-activation-blockers-design.md](../specs/2026-07-02-midtrans-activation-blockers-design.md) punya task yang mengimplementasikannya.
- **Placeholder scan**: tidak ada "TBD"/"implement later" — semua step berisi kode lengkap atau query SQL lengkap.
- **Type consistency**: `StoreOrigin`, `getStoreOrigin`, `getWhatsappCs`, `getStoreOriginFullAddress`, `getStoreOriginMapsUrl` dipakai dengan nama & signature yang sama persis di Task 1 (didefinisikan), Task 5 (dikonsumsi di footer & contact page) — dicek konsisten.
- **Urutan task**: Task 1 harus selesai sebelum Task 5 (dependency langsung). Task 3 harus selesai sebelum Task 4 (Task 4 menambah entri footer yang mengasumsikan `/syarat-ketentuan`, `/kebijakan-privasi` sudah ada dengan slug baru). Task 2 dan Task 6 independen, bisa dikerjakan kapan saja relatif ke task lain.
