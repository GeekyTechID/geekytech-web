# GeekyTech — Claude Code Context

## Project Overview

GeekyTech adalah platform ecommerce toko tech/gadget berbasis web.

- Migrasi dari Tokopedia ke platform sendiri
- 107 produk, 3.565 pelanggan, 23.000+ transaksi existing
- Target: production-ready ecommerce dengan fitur lengkap

---

## Tech Stack

```
Frontend & Backend  : Next.js 15 + TypeScript (App Router)
Styling             : Tailwind CSS + shadcn/ui
Design System       : Apple's web (Refer to Design System below)
Animation           : GSAP
State Management    : Zustand
Form & Validasi     : React Hook Form + Zod
Database            : Supabase (PostgreSQL + Auth + Storage)
Payment             : Midtrans Snap
Shipping            : Biteship
Email               : Resend
Analytics           : Google Analytics 4
Deployment          : Vercel
Version Control     : GitHub (branch: main = production, development = preview)
```

---

## Design System

refer to .cursor/rules/design.mdc

---

## Struktur Folder

```
/app
  /(public)                 → layout publik (navbar + footer)
    /page.tsx               → Homepage
    /products/page.tsx      → List Produk
    /products/[slug]/page.tsx → Detail Produk
    /category/[slug]/page.tsx → Produk per Kategori
    /search/page.tsx        → Search Results
    /cart/page.tsx          → Keranjang
    /checkout/page.tsx      → Checkout
    /checkout/payment/page.tsx
    /checkout/success/page.tsx
    /checkout/failed/page.tsx
    /checkout/pending/page.tsx
    /track/page.tsx         → Cek Resi tanpa login
    /cek-ongkir/page.tsx    → Cek Ongkir tanpa login
    /about/page.tsx
    /contact/page.tsx
    /faq/page.tsx
    /cara-belanja/page.tsx
    /kebijakan-pengembalian/page.tsx
    /kebijakan-privasi/page.tsx
    /syarat-ketentuan/page.tsx

  /(auth)                   → layout auth (tanpa navbar/footer)
    /login/page.tsx
    /register/page.tsx
    /forgot-password/page.tsx
    /reset-password/page.tsx
    /verify-email/page.tsx

  /(dashboard)              → layout dashboard user (sidebar)
    /dashboard/page.tsx
    /dashboard/orders/page.tsx
    /dashboard/orders/[id]/page.tsx
    /dashboard/orders/[id]/tracking/page.tsx
    /dashboard/orders/[id]/invoice/page.tsx
    /dashboard/orders/[id]/review/page.tsx
    /dashboard/orders/[id]/complaint/page.tsx
    /dashboard/wishlist/page.tsx
    /dashboard/profile/page.tsx
    /dashboard/addresses/page.tsx
    /dashboard/addresses/new/page.tsx
    /dashboard/addresses/[id]/edit/page.tsx
    /dashboard/change-password/page.tsx
    /dashboard/notifications/page.tsx
    /dashboard/vouchers/page.tsx

  /admin                    → layout admin (sidebar admin)
    /admin/login/page.tsx
    /admin/page.tsx          → Dashboard
    /admin/products/...
    /admin/categories/...
    /admin/orders/...
    /admin/customers/...
    /admin/reviews/page.tsx
    /admin/complaints/page.tsx
    /admin/coupons/...
    /admin/banners/page.tsx
    /admin/flash-sale/page.tsx
    /admin/reports/page.tsx
    /admin/stock/page.tsx
    /admin/notifications/page.tsx
    /admin/settings/page.tsx
    /admin/settings/shipping/page.tsx
    /admin/settings/payment/page.tsx

  /api
    /api/auth/...
    /api/products/...
    /api/orders/...
    /api/cart/...
    /api/checkout/...
    /api/webhooks/midtrans/route.ts   ← KRITIS: verify signature
    /api/webhooks/biteship/route.ts   ← KRITIS: verify signature
    /api/shipping/rates/route.ts
    /api/shipping/track/route.ts
    /api/coupons/validate/route.ts
    /api/upload/route.ts
    /api/ping/route.ts                ← untuk cron-job.org anti-pause

  /not-found.tsx
  /error.tsx
  /maintenance.tsx
  /layout.tsx
  /middleware.ts              ← route protection

/components
  /ui/                       → shadcn/ui components
  /layout/                   → Navbar, Footer, Sidebar
  /product/                  → ProductCard, ProductGallery, dll
  /cart/                     → CartDrawer, CartItem
  /checkout/                 → CheckoutForm, ShippingOptions, dll
  /order/                    → OrderCard, OrderStatus, OrderTracking
  /admin/                    → komponen khusus admin
  /shared/                   → komponen reusable umum

/lib
  /supabase/                 → client, server, middleware
  /midtrans/                 → helper create transaction, verify signature
  /biteship/                 → helper check rates, create order, track
  /resend/                   → email templates & sender
  /gsap/                     → animasi reusable
  /utils.ts
  /validations/              → Zod schemas

/hooks                       → custom React hooks
/store                       → Zustand stores
/types                       → TypeScript types & interfaces
/constants                   → konstanta app
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        ← hanya server, jangan expose ke client

# Midtrans
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
MIDTRANS_SERVER_KEY=              ← hanya server
MIDTRANS_IS_PRODUCTION=false      ← true saat production

# Biteship
BITESHIP_API_KEY=                 ← hanya server

# Resend
RESEND_API_KEY=                   ← hanya server
RESEND_FROM_EMAIL=noreply@geekytech.com

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=                  ← random string
```

---

## Aturan Coding

### General

- Selalu gunakan TypeScript strict mode
- Gunakan `async/await`, bukan `.then()`
- Semua error wajib di-handle dengan try/catch
- Jangan hardcode string penting — pakai constants atau env
- Gunakan path alias `@/` untuk semua import

### Supabase

- Gunakan **server client** (`createServerClient`) di Server Components & API Routes
- Gunakan **browser client** (`createBrowserClient`) di Client Components
- **JANGAN** gunakan `SUPABASE_SERVICE_ROLE_KEY` di client-side
- RLS sudah aktif — query otomatis terfilter per user
- Untuk operasi admin, gunakan service role key di API route

### API Routes

- Semua API route wajib validasi input dengan Zod
- Webhook Midtrans: **wajib** verify signature sebelum proses apapun
- Webhook Biteship: **wajib** verify signature sebelum proses apapun
- Rate limiting aktif di semua endpoint publik
- Return format konsisten:
  ```typescript
  // Success
  { success: true, data: {...} }
  // Error
  { success: false, error: "pesan error" }
  ```

### Midtrans

- Pakai **Snap** (bukan Core API)
- Signature verification: `SHA512(orderId + statusCode + grossAmount + serverKey)`
- Handle semua status: `pending`, `settlement`, `capture`, `deny`, `expire`, `cancel`, `challenge`
- Cek idempotency sebelum update database (cegah duplikat proses webhook)
- Payment timeout: 3 jam (bisa dikonfigurasi dari `settings` table)

### Biteship

- Selalu sertakan berat (gram) dan dimensi saat create order
- Ambil alamat origin dari `settings` table, bukan hardcode
- Create shipment hanya setelah Midtrans status `settlement`
- Simpan AWB ke tabel `shipments` setelah dapat dari Biteship

### Stok

- Saat user checkout → tambah `reserved` di `product_variants`
- Saat payment expire/cancel → kurangi `reserved` (release)
- Saat payment settlement → kurangi `stock` dan `reserved`
- Stok aktual yang ditampilkan ke user = `stock - reserved`
- Catat semua perubahan stok di `stock_history`

### GSAP

- Import GSAP hanya di Client Components (`"use client"`)
- Gunakan `useGSAP` hook dari `@gsap/react`
- Cleanup animasi di return function useEffect/useGSAP
- Jangan animasi sesuatu yang belum di-mount

### Zustand

- Pisahkan store per domain: `cartStore`, `authStore`, `uiStore`
- Persist `cartStore` ke localStorage sebagai fallback

### Form

- Semua form pakai React Hook Form + Zod schema
- Error message ditampilkan di bawah field
- Loading state saat submit

---

## Security Checklist

- RLS aktif di semua tabel Supabase
- `/dashboard/`* → redirect ke `/login` jika belum login (middleware)
- `/admin/*` → redirect jika bukan role `admin` (middleware)
- Midtrans webhook signature diverifikasi
- Biteship webhook signature diverifikasi
- `SUPABASE_SERVICE_ROLE_KEY` tidak pernah ke client
- Rate limiting di API routes publik
- Input validation dengan Zod di semua API route
- CAPTCHA (Cloudflare Turnstile) di login & register

---

## Cron Job — Anti Pause Supabase

Endpoint: `GET /api/ping`
Setup di cron-job.org: ping setiap 5 hari sekali
Tujuan: mencegah Supabase free tier auto-pause karena tidak aktif

---

## Email Templates (Resend)

Kirim email untuk:

1. Verifikasi email (daftar)
2. Reset password
3. Konfirmasi order
4. Instruksi pembayaran
5. Pembayaran berhasil
6. Order diproses
7. Paket dikirim (+ AWB + link tracking)
8. Paket tiba
9. Order selesai (minta review)
10. Order dibatalkan
11. Refund diproses
12. Komplain diterima
13. Low stock alert → ke admin

---

## GA4 Events

Wajib track event berikut:

```
view_item          → saat buka halaman produk
add_to_cart        → saat tambah ke cart
begin_checkout     → saat mulai checkout
add_payment_info   → saat pilih metode bayar
purchase           → saat order berhasil
```

---

## Catatan Penting

1. **Snapshot data di order_items** — nama produk, harga, berat, gambar wajib disimpan sebagai snapshot saat checkout. Jangan hanya simpan FK karena data produk bisa berubah.
2. **Order number format**: `GT-YYYYMMDD-XXXXXX` (auto-generated via DB trigger)
3. **Alamat pengiriman di order** disimpan sebagai snapshot (bukan FK ke `addresses`)
4. **Cart** tersimpan di database, bukan hanya localStorage
5. **Dark mode** didukung — Swiss style sangat cocok di dark mode
6. **Mobile-first** — semua halaman harus responsive
7. **Bottom navigation bar** untuk mobile
8. **WhatsApp CS floating button** di semua halaman publik
9. **ISR** untuk halaman produk (revalidate setiap 60 detik)
10. **SSG** untuk halaman statis (About, FAQ, dll)
11. **Jangan bikin custom css/style. Semuanya di className

---

## Branch & Deployment

```
development → Vercel Preview URL (testing)
main        → Vercel Production URL (live)
```

Selalu coding di branch `development`. Merge ke `main` hanya setelah QA.

---

## Referensi

- Supabase Docs: [https://supabase.com/docs](https://supabase.com/docs)
- Midtrans Snap Docs: [https://docs.midtrans.com/reference/snap-js](https://docs.midtrans.com/reference/snap-js)
- Biteship API Docs: [https://biteship.com/id/docs](https://biteship.com/id/docs)
- Resend Docs: [https://resend.com/docs](https://resend.com/docs)
- GSAP Docs: [https://gsap.com/docs/v3/](https://gsap.com/docs/v3/)
- shadcn/ui: [https://ui.shadcn.com](https://ui.shadcn.com)

