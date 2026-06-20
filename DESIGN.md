---
name: GeekyTech
description: Toko elektronik premium yang tenang ala Apple, dibangun di atas komponen shadcn.
colors:
  geekytech-red: "#EA5329"
  geekytech-red-hover: "#d44820"
  geekytech-red-focus: "#FF7A52"
  geekytech-red-on-dark: "#FFAD88"
  star-gold: "oklch(0.80 0.15 83)"
  ink: "#000000"
  paper: "#ffffff"
  neutral-100: "oklch(0.97 0 0)"
  neutral-200: "oklch(0.93 0 0)"
  neutral-300: "oklch(0.87 0 0)"
  neutral-500: "oklch(0.60 0 0)"
  neutral-700: "oklch(0.38 0 0)"
  neutral-900: "oklch(0.15 0 0)"
  ink-muted: "oklch(0.45 0 0)"
  error: "oklch(0.55 0.22 27)"
  hairline: "#e0e0e0"
  canvas-alt: "#f5f5f7"
  input-border: "oklch(0.92 0 0)"
typography:
  headline:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3rem)"
    fontWeight: 900
    lineHeight: 1.25
    letterSpacing: "normal"
  title:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 900
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  3xl: "22px"
  4xl: "26px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.geekytech-red}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "11px 22px"
  button-primary-hover:
    backgroundColor: "{colors.geekytech-red-hover}"
  button-dark:
    backgroundColor: "#1d1d1f"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 15px"
  badge-default:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "32px"
---

# Design System: GeekyTech

## 1. Overview

**Creative North Star: "The Quiet Showroom"**

GeekyTech adalah etalase tenang untuk produk tech & gadget: foto produk dan informasi transaksi (harga, stok, varian) yang berbicara, UI yang mundur ke belakang. Sistem ini dibangun di atas **komponen shadcn** — `Button`, `Input`, `Badge` dengan varian `cva` yang sudah konsisten dipakai di seluruh aplikasi — dipadukan dengan disiplin satu warna aksen (`#EA5329`) dan kartu/tile yang flat tanpa border berat. Heading ditulis sentence case di weight tebal (900), tidak pernah huruf besar semua atau eyebrow kecil bertracking lebar.

Sistem ini secara sadar **menolak register "Swiss"** (huruf besar bertracking, kotak dengan border hitam tegas, grid 12-kolom kaku) meskipun token dan utility class itu (`.text-swiss-*`, `.swiss-box`, `.swiss-divider`, `.swiss-grid`) masih ada di `app/globals.css` sebagai sisa iterasi awal. Token tersebut dianggap **legacy** — jangan dipakai untuk layar baru. Sistem ini juga menolak dua hal dari `PRODUCT.md`: tampilan generic marketplace (badge diskon bertumpuk, warna ramai, padat tanpa napas) dan generic SaaS card grid (kartu kotak identik + shadow lembut + border tipis di semua sisi).

**Key Characteristics:**
- Komponen shadcn (`Button`, `Input`, `Badge`) sebagai satu-satunya bahasa komponen — bukan markup custom per halaman.
- Satu warna aksen, GeekyTech Red (`#EA5329`), untuk setiap elemen interaktif. Tidak ada warna brand kedua.
- Tile produk flat: tanpa border, tanpa shadow, pemisah antar section lewat pergantian warna latar (putih ↔ `#f5f5f7`).
- Heading sentence case, weight 900, tanpa huruf besar semua, tanpa eyebrow kecil bertracking lebar.
- Tombol pill (`rounded-full`) dengan efek ripple-press (`scale(0.95)` + riak radial) sebagai micro-interaction sistem-lebar.
- Dua grammar fokus yang disengaja: outline keras `#FF7A52` 2px di tombol, ring lembut merah 50%-alpha 3px di input.

## 2. Colors

Palet ini sengaja sempit: satu aksen merah, satu aksen gold fungsional (rating), sisanya skala netral hitam-putih-abu.

### Primary
- **GeekyTech Red** (`#EA5329`): satu-satunya sinyal "bisa diklik" di seluruh produk — tombol primary/secondary/hero, link teks, ring fokus default, garis aktif di sidebar admin. Hover ke `#d44820`.

### Secondary
- **Star Gold** (`oklch(0.80 0.15 83)`): khusus untuk bintang rating & angka ulasan di tile produk. Tidak pernah dipakai untuk elemen interaktif atau status lain — begitu dipakai di luar konteks rating, perannya jadi rancu.

### Neutral
- **Ink** (`#000000`): teks utama, border default, warna `primary` shadcn (tombol `dark`, badge `default`).
- **Paper** (`#ffffff`): kanvas dominan — background, card, popover.
- **Ink Muted** (`oklch(0.45 0 0)`): teks sekunder (eyebrow produk, caption, "X terjual") — bukan abu generik, ini token `--muted-foreground` yang sudah dipakai konsisten.
- **Neutral 100–900** (`oklch(0.97 0 0)` → `oklch(0.15 0 0)`): skala abu pendukung untuk fill, divider lembut, dan teks tersier saat Ink Muted terlalu gelap/terang untuk konteksnya.

### Semantic / State
- **Error** (`oklch(0.55 0.22 27)`): destructive actions (hapus, batalkan), validasi gagal. Hue-nya beda dari GeekyTech Red — jangan tertukar, terutama di tombol "Hapus" vs tombol aksi utama.

### Hairlines & Borders
- **Hairline** (`#e0e0e0`): border lembut untuk card admin, sidebar, topbar, toast — dipakai saat butuh pemisah tapi tidak ingin border hitam tegas.
- **Canvas Alt / Parchment** (`#f5f5f7`): kanvas kedua untuk alternasi section (mengikuti pola "parchment" Apple) dan shell admin.
- **Input Border** (`oklch(0.92 0 0)`): border default field form, sebelum fokus.

### Named Rules
**The One Signal Rule.** GeekyTech Red berarti "aksi utama" dan tidak berarti hal lain. Jangan pakai untuk dekorasi, ilustrasi, atau aksen non-interaktif — kelangkaannya yang membuatnya berarti.

**The Two-Focus Rule.** Tombol pakai outline keras 2px `#FF7A52` (`outline-offset-2`). Input/field pakai ring lembut 3px merah 50%-alpha plus border berubah ke `--ring`. Jangan tukar pasangannya — outline keras di input akan terasa kasar, ring lembut di tombol akan terasa lemah.

## 3. Typography

**Display/Body Font:** Inter (dimuat lewat `next/font/google`, variable CSS-nya masih bernama `--font-geist-sans` — peninggalan sebelum font diganti, bukan indikasi font sebenarnya).
**Mono Font:** JetBrains Mono — dipakai untuk konteks tabular/kode (nomor order, SKU).

**Character:** Tegas tapi tenang — weight 900 untuk semua heading (tidak ada langkah 500/600/700 di antaranya), sentence case selalu, tanpa letter-spacing dekoratif.

### Hierarchy
- **Headline** (900, `clamp(2.25rem, 5vw, 3rem)` ≈ 36px→48px, leading 1.25): judul halaman/section utama. Ini default `<h1>`/`<h2>` shadcn-style — sentence case, bukan `.text-swiss-display`.
- **Title** (900, ~1.25rem dengan tangga responsif nyata `text-lg → text-xl → text-2xl` / 18px→20px→24px, leading 1.3): judul section di tile/blok ("Produk Terbaru", nama brand di grouping kategori). Ukuran persis di-set per komponen, bukan mengandalkan default `<h3>`.
- **Body** (400, 1rem/16px, leading 1.65): paragraf, deskripsi, subtitle section.
- **Label** (500, 0.75rem/12px, leading 1.3, tanpa letter-spacing): label form, teks badge, caption kecil — sentence/normal case, **bukan** huruf besar semua.
- **Mono** (400, 0.875rem/14px): nomor order (`GT-YYYYMMDD-XXXXXX`), SKU, angka tabular di admin.

### Named Rules
**The Sentence-Case Rule.** Tidak ada heading, label, atau badge yang ditulis huruf besar semua atau eyebrow kecil bertracking lebar. `.text-swiss-eyebrow` dan `.text-swiss-label` (uppercase, tracking 0.12em) adalah token legacy — jangan dipanggil di layar baru.
**The Weight-900 Rule.** Saat sesuatu perlu terasa sebagai judul, naikkan ke weight 900, bukan ke ukuran yang lebih besar atau warna aksen. Ukuran dan warna dihemat untuk hierarki lain.

## 4. Elevation

Flat by default. Tidak ada satupun varian `Button` yang memakai shadow (`shadow-none` eksplisit di semua varian). Kedalaman datang dari pergantian warna latar (putih ↔ `#f5f5f7`) atau border tipis (`#e0e0e0`), bukan dari bayangan dekoratif.

### Shadow Vocabulary
- **Toast Soft** (`box-shadow: 0 4px 12px rgb(0 0 0 / 0.08)`): satu-satunya shadow nyata di sistem ini, dipakai khusus untuk notifikasi toast (sonner) yang melayang di atas konten.
- **Topbar Blur**: `backdrop-blur-md backdrop-saturate-150` pada topbar admin — kedalaman lewat blur, bukan shadow, untuk elemen sticky.

### Named Rules
**The Flat-by-Default Rule.** Card dan tombol tidak pernah pakai shadow untuk terasa "terangkat". Kalau sebuah elemen terasa butuh kedalaman, coba dulu: ganti warna latar, atau tambahkan hairline `#e0e0e0`. Shadow nyata disediakan khusus untuk overlay sementara (toast), bukan untuk chrome permanen.

## 5. Components

### Buttons

Berbasis `components/ui/button.tsx` (shadcn + `cva`). Semua varian: `transition-[transform,background-color,color,border-color,opacity]` 160ms `ease-spring`, dan saat ditekan memunculkan riak radial dari titik klik (`scale(0)→1.5`, opacity `0→0.12`, 300ms `ease-spring`, kembali 50ms) plus `scale(0.95)` pada elemen tombolnya sendiri.

- **Primary** (`rounded-full`, bg GeekyTech Red, teks putih, padding `11px 22px`): aksi utama — "Tambah ke Keranjang", "Bayar Sekarang".
- **Secondary** (`rounded-full`, border GeekyTech Red, bg transparan, teks merah): aksi kedua di sebelah primary.
- **Dark** (`rounded-md` 8px, bg `#1d1d1f`, teks putih): utility compact — nav "Masuk", ikon keranjang.
- **Pearl** (`rounded-xl` 14px, bg `#fafafc`, border 3px `#f0f0f0`, teks `#333333`): kapsul sekunder netral di atas kanvas parchment.
- **Ghost** (`rounded-md`, transparan, hover ke `bg-muted`): aksi tersier tanpa tekanan visual.
- **Destructive / Destructive-Ghost**: warna `error`, dipakai khusus alur hapus/batalkan — di luar referensi Apple, sengaja ditambahkan untuk kebutuhan ecommerce.
- **Link**: teks GeekyTech Red, underline saat hover, tanpa padding/scale-press.
- **Icon-Chip** (`rounded-full`, bg `rgba(210,210,215,0.64)`): kontrol bulat melayang di atas foto (carousel, close button).
- **Table-Action / Table-Action-Brand / Table-Action-Destructive** (`rounded-md`, border `#e0e0e0` atau varian warna): aksi baris compact khusus tabel admin.

**Focus:** outline keras 2px `#FF7A52`, offset 2px — bukan ring lembut (itu milik input).
**Disabled:** opacity 50%, `pointer-events-none`, tidak ada efek press.
**Touch target:** ukuran `default` = `min-h-11` (44px) — selalu pakai ini atau lebih besar untuk target sentuh baru, jangan turun ke `xs`/`sm` di konteks mobile primer.

### Chips

Berbasis `components/ui/badge.tsx`. `rounded-4xl` pada elemen setinggi 20px (`h-5`) sehingga tampil sebagai pill penuh secara visual.

- **Default**: bg Ink, teks putih — status netral/terpilih kuat.
- **Secondary**: bg neutral, teks foreground — status netral lembut.
- **Destructive**: bg `error/10` (tint lembut), teks `error` — bukan fill solid. Ini polanya: status butuh *tint* lembut, bukan warna penuh.
- **Outline / Ghost / Link**: border tipis / transparan / teks-saja untuk konteks yang lebih senyap.

`Badge` adalah dasar yang tepat untuk chip filter aktif pada `/products` — perlu varian baru "selected" (bg GeekyTech Red/10, teks GeekyTech Red, ikon ✕ untuk hapus filter) mengikuti pola tint-lembut yang sama seperti `destructive`, bukan fill merah solid.

### Cards / Containers

Dua grammar yang hidup berdampingan, dipakai sesuai konteks:

- **Product Tile** (storefront — `home-product-tile.tsx`): flat, tanpa border, tanpa shadow, tanpa radius pada container. Gambar `aspect-square` dengan padding internal 8px (`p-2`), konten padding `p-3`. Ini default untuk surface produk-ke-pembeli.
- **Utility Card** (admin/dashboard — `.admin-utility-card`): `rounded-2xl` (18px), border `#e0e0e0`, bg card. Dipakai untuk panel/tabel di admin, bukan untuk listing produk publik.

Untuk `/products`, pakai grammar **Product Tile** (flat) untuk grid hasil; kalau filter sidebar/panel butuh kontainer, pakai grammar **Utility Card** (border halus, tanpa shadow) — jangan campur keduanya dalam satu card yang sama, dan jangan tambah shadow ke salah satunya.

### Inputs / Fields

Berbasis `components/ui/input.tsx`. `rounded-lg` (10px), border `input-border`, bg transparan, tinggi `h-8` (32px).
**Focus:** border berubah ke `--ring` (GeekyTech Red) + ring lembut 3px merah 50%-alpha.
**Error:** `aria-invalid` → border `error` + ring lembut 3px `error/20`. Pola tint-lembut yang sama dipakai ulang di sini.

**Gap yang perlu ditambal saat membangun search/filter baru:** tinggi default 32px ada di bawah ambang target sentuh 44px yang ditetapkan `PRODUCT.md`. Untuk search bar dan kontrol filter baru di `/products` (terutama varian mobile), naikkan tinggi field secara eksplisit — jangan pakai `h-8` default apa adanya.

### Wayfinding Links

Pola "Lihat Semua" yang sudah konsisten dipakai di semua section promo homepage: `text-sm font-semibold text-brand transition hover:text-[#d44820]`, diposisikan kanan-atas berdampingan dengan judul section (`flex items-start justify-between gap-3`). Pakai pola yang sama untuk link wayfinding sejenis di `/products` (misalnya "Lihat semua di kategori ini").

## 6. Do's and Don'ts

### Do:
- **Do** bangun semua komponen baru di atas `Button`, `Input`, `Badge` shadcn yang sudah ada — varian baru lewat `cva`, bukan markup/style custom.
- **Do** pakai GeekyTech Red (`#EA5329`) hanya untuk aksi utama dan state aktif/terpilih.
- **Do** tulis heading sentence case di weight 900 — bukan huruf besar semua, bukan eyebrow kecil bertracking lebar.
- **Do** pakai pola tint-lembut (`bg-color/10`, `text-color`) untuk status (destructive badge, error input) — bukan fill solid.
- **Do** jaga target sentuh interaktif baru ≥ 44×44px, terutama kontrol filter/sort/search di `/products`.
- **Do** pisahkan kedua grammar fokus: outline keras `#FF7A52` di tombol, ring lembut merah 50%-alpha di input — jangan tukar.
- **Do** pakai grammar Product Tile (flat, tanpa border/shadow) untuk grid produk publik; grammar Utility Card (`rounded-2xl`, border `#e0e0e0`) khusus admin/dashboard.

### Don't:
- **Don't** panggil `.text-swiss-display`, `.text-swiss-heading`, `.text-swiss-eyebrow`, `.text-swiss-label`, `.swiss-box`, `.swiss-divider`, atau `.swiss-grid` di layar baru — token legacy, register Swiss sudah ditolak untuk sistem ini.
- **Don't** tambahkan warna brand kedua. GeekyTech Red tetap satu-satunya sinyal interaktif.
- **Don't** tambahkan shadow dekoratif ke card, tile, atau tombol — shadow nyata hanya untuk toast.
- **Don't** bikin badge diskon bertumpuk, warna ramai, atau layout padat tanpa napas — ciri generic marketplace yang ditolak di `PRODUCT.md`.
- **Don't** bikin grid kartu identik (ikon + heading + teks, berulang) dengan shadow lembut + border tipis di semua sisi — ciri generic SaaS card grid yang ditolak di `PRODUCT.md`.
- **Don't** pasang `border` 1px + `box-shadow` blur ≥16px sekaligus pada elemen yang sama ("ghost card"). Pilih satu: border halus, atau shadow Toast Soft — jangan dua-duanya.
- **Don't** turunkan tinggi field interaktif baru di bawah 44px pada konteks mobile hanya karena `Input` default-nya 32px.
