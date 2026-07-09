# Design: Menu "Others" di Nav Kategori Header

**Date:** 2026-07-09
**Status:** Approved

## Overview

Nav kategori di bawah `StoreHeader` (`components/store/store-header.tsx`) berisi shortcut belanja kurasi manual (bukan daftar kategori DB penuh): Smartwatch, Headset, Speaker, Shops by Brand, dan Second Hand (kondisional, hanya muncul kalau ada promo produk second aktif).

Tambah 1 item baru: **"Others"**, link ke `/products` polos tanpa filter kategori — menampilkan semua produk. Posisi: paling akhir nav, setelah Second Hand (kalau tampil).

Tidak berlaku untuk: dropdown/submenu isi kategori DB tersisa (sudah ditolak user — cukup link langsung ke halaman semua produk).

---

## 1. Nav Item

`buildStoreHeaderNavItems` (line ~72-83): tambah item di akhir array, setelah push Second Hand kondisional.

```ts
function buildStoreHeaderNavItems(secondHandPromoId: string | null): StoreHeaderNavItem[] {
  const items: StoreHeaderNavItem[] = [
    { label: "Smartwatch", href: "/products?category=smartwatch" },
    { label: "Headset", href: "/products?category=headphone,earphone" },
    { label: "Speaker", href: "/products?category=speaker" },
    { label: "Shops by Brand", href: "/brands" },
  ];
  if (secondHandPromoId) {
    items.push({ label: "Second Hand", href: `/promo/${secondHandPromoId}` });
  }
  items.push({ label: "Others", href: "/products" });
  return items;
}
```

## 2. Fix Active-State Logic

`isStoreHeaderNavItemActive` (line ~85-92) menentukan status aktif nav item berdasar match pathname. Untuk href tanpa query (`/brands`, `/products`), logic sekarang cuma cek prefix pathname — tidak peduli `categoryParam`.

Masalah: kalau dipakai apa adanya untuk "Others" (`/products` tanpa query), item ini akan ikut ter-highlight bareng Smartwatch/Headset/Speaker setiap kali user berada di `/products?category=...` — dua item aktif sekaligus, membingungkan secara visual.

Fix: special-case href `/products` polos — aktif hanya kalau `categoryParam === null` (tidak ada filter kategori sama sekali).

```ts
function isStoreHeaderNavItemActive(href: string, pathname: string, categoryParam: string | null): boolean {
  const [hrefPath, hrefQuery] = href.split("?");
  if (hrefQuery) {
    const category = new URLSearchParams(hrefQuery).get("category");
    return pathname === hrefPath && category !== null && category === categoryParam;
  }
  if (hrefPath === "/products") {
    return pathname === hrefPath && categoryParam === null;
  }
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}
```

Dipakai sama di desktop nav dan mobile sheet nav (satu fungsi, satu `navItems` array) — satu perubahan cukup untuk keduanya.

## 3. Testing

Manual: buka `/products` (tanpa query) → "Others" aktif, yang lain tidak. Buka `/products?category=smartwatch` → "Smartwatch" aktif, "Others" tidak. Klik "Others" dari halaman lain → landing di `/products` semua produk tampil.
