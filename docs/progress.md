# GeekyTech — Progress Tracker

> File ini diupdate setiap sesi coding.
> Tujuan: agar Claude Code / Cursor selalu tahu konteks terkini
> tanpa perlu membaca ulang semua file dari awal.

---

## Status Project

**Fase aktif**: FASE 0 — Setup & Infrastruktur
**Last updated**: (isi tanggal setiap update)
**Branch aktif**: development

---

## Yang Sudah Selesai

> Isi setelah setiap task selesai. Format: tanggal + deskripsi singkat.

```
(belum ada)
```

---

## Sedang Dikerjakan

> Maksimal 3 item. Fokus jangan terlalu banyak sekaligus.

```
(belum ada)
```

---

## Masalah / Blocked

> Catat bug, error, atau hal yang membutuhkan keputusan.

```
(belum ada)
```

---

## Keputusan Teknis yang Sudah Dibuat

> Catat keputusan penting agar tidak dipertanyakan ulang.

| Topik | Keputusan | Alasan |
|---|---|---|
| Payment | Midtrans Snap | Lebih simpel dari Core API, cukup untuk MVP |
| Shipping | Biteship | Aggregator kurir Indonesia terbaik |
| Database | Supabase Free → Pro | Gratis dulu, upgrade saat traffic naik |
| Hosting | Vercel | Zero config untuk Next.js |
| Auth | Supabase Auth + Google OAuth | Built-in, tidak perlu NextAuth |
| State | Zustand | Paling simpel, tidak boilerplate |
| Form | RHF + Zod | Industry standard, type-safe |
| Email | Resend | DX terbaik, free 3000 email/bulan |
| CAPTCHA | Cloudflare Turnstile | Gratis, lebih baik dari reCAPTCHA |
| Design | Swiss Style | Sesuai brief, cocok untuk toko tech |
| Animation | GSAP | Sesuai permintaan client |

---

## Struktur Tabel Database

> Update setelah tabel berhasil dibuat di Supabase.

- [ ] profiles
- [ ] addresses
- [ ] categories
- [ ] products
- [ ] product_images
- [ ] product_variants
- [ ] product_tags
- [ ] product_views
- [ ] wishlists
- [ ] carts
- [ ] cart_items
- [ ] coupons
- [ ] orders
- [ ] order_items
- [ ] coupon_usages
- [ ] order_status_history
- [ ] payments
- [ ] shipments
- [ ] product_reviews
- [ ] notifications
- [ ] banners
- [ ] flash_sales
- [ ] flash_sale_products
- [ ] complaints
- [ ] stock_history
- [ ] settings
- [ ] faqs

---

## Env Variables Status

| Variable | Dev | Production |
|---|---|---|
| SUPABASE_URL | ⬜ | ⬜ |
| SUPABASE_ANON_KEY | ⬜ | ⬜ |
| SUPABASE_SERVICE_ROLE_KEY | ⬜ | ⬜ |
| MIDTRANS_CLIENT_KEY | ⬜ | ⬜ |
| MIDTRANS_SERVER_KEY | ⬜ | ⬜ |
| BITESHIP_API_KEY | ⬜ | ⬜ |
| RESEND_API_KEY | ⬜ | ⬜ |
| GA_MEASUREMENT_ID | ⬜ | ⬜ |
| TURNSTILE_SITE_KEY | ⬜ | ⬜ |
| TURNSTILE_SECRET_KEY | ⬜ | ⬜ |

✅ = sudah diisi | ⬜ = belum

---

## Catatan Sesi Terakhir

> Tulis di sini apa yang dikerjakan di sesi terakhir dan
> apa yang harus dilanjutkan di sesi berikutnya.

```
Sesi terakhir: -
Dilanjutkan: Mulai dari FASE 0 — Setup project
```

---

## Referensi Cepat

```
Figma Design   : https://www.figma.com/design/lnrydZW9O6Hdo4dpnQS5Nx/GeekyTech
Vercel         : https://vercel.com/dashboard
Supabase       : https://supabase.com/dashboard
Midtrans       : https://dashboard.midtrans.com
Biteship       : https://biteship.com/dashboard
Resend         : https://resend.com/overview
cron-job.org   : https://cron-job.org/en/members/jobs/
```
