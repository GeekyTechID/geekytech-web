# GeekyTech — Task List

> Format: `- [ ]` = belum, `- [x]` = selesai
> Urutan dikerjakan dari atas ke bawah agar sistem sinkron.
> Referensi database: lihat `database.md`

---

## FASE 0 — Setup & Infrastruktur

### 0.1 GitHub & Version Control
- [x] Buat private repo `geekytech` di GitHub
- [x] Init project geekytech-web
- [x] Push ke branch `main`
- [x] Buat branch `development`
- [x] Set default branch GitHub ke `development`
- [x] Tambahkan `.gitignore` (env, node_modules, dll)

### 0.2 Setup Vercel
- [x] Buat akun / login Vercel
- [x] Import repo `geekytech` dari GitHub
- [x] Set Production Branch ke `main`
- [x] Verifikasi branch `development` dapat Preview URL

### 0.3 Setup Supabase
> Storage: jika bucket belum ada di Dashboard → Storage, jalankan sekali `docs/supabase-storage-buckets.sql` di SQL Editor.
- [x] Buat project Supabase
- [x] Copy `SUPABASE_URL` dan `SUPABASE_ANON_KEY`
- [x] Copy `SUPABASE_SERVICE_ROLE_KEY`
- [x] Enable Email Auth di Supabase
- [ ] Enable Google OAuth di Supabase
- [x] Setup Supabase Storage buckets:
  - [x] `products` (public)
  - [x] `avatars` (private)
  - [x] `complaints` (private)
  - [x] `invoices` (private)
  - [x] `banners` (public)

### 0.4 Setup Akun Third-Party
- [x] Daftar / login Midtrans → ambil Sandbox keys
- [x] Daftar / login Biteship → ambil Testing API key
- [x] Daftar / login Resend → ambil API key + verifikasi domain
- [ ] Setup Google Analytics 4 → ambil Measurement ID
- [ ] Daftar cron-job.org (untuk ping Supabase)
- [x] Setup Cloudflare Turnstile (CAPTCHA) → ambil site key & secret

### 0.5 Setup Project Next.js
> **Vercel:** daftar nama variabel untuk copy-paste ke dashboard ada di `geekytech-web/docs/VERCEL-ENV.md` — isi nilai di UI Vercel (tidak otomatis dari repo).
- [x] Install dependencies:
  ```
  @supabase/supabase-js @supabase/ssr
  zustand
  react-hook-form zod @hookform/resolvers
  gsap @gsap/react
  resend
  midtrans-client
  @types/midtrans-client
  sonner (toast)
  next-themes (dark mode)
  ```
- [x] Setup shadcn/ui (init + install komponen dasar)
- [x] Buat file `.env.local` dari `env.example`
- [ ] Tambahkan semua env variables ke Vercel (dev & production) — gunakan `geekytech-web/docs/VERCEL-ENV.md`
- [x] Setup Tailwind config (design tokens Swiss Style)
- [x] Setup path alias `@/` di tsconfig

---

## FASE 1 — Database & Backend Foundation

### 1.1 Database Schema
> Referensi lengkap: `database.md`

- [ ] Buat PostgreSQL enums:
  - [ ] `order_status`
  - [ ] `payment_status`
  - [ ] `shipment_status`
- [ ] Buat tabel sesuai urutan (perhatikan foreign key):
  - [ ] `profiles`
  - [ ] `addresses`
  - [ ] `categories`
  - [ ] `products`
  - [ ] `product_images`
  - [ ] `product_variants`
  - [ ] `product_tags`
  - [ ] `product_views`
  - [ ] `wishlists`
  - [ ] `carts`
  - [ ] `cart_items`
  - [ ] `coupons`
  - [ ] `orders`
  - [ ] `order_items`
  - [ ] `coupon_usages`
  - [ ] `order_status_history`
  - [ ] `payments`
  - [ ] `shipments`
  - [ ] `product_reviews`
  - [ ] `notifications`
  - [ ] `banners`
  - [ ] `flash_sales`
  - [ ] `flash_sale_products`
  - [ ] `complaints`
  - [ ] `stock_history`
  - [ ] `settings`
  - [ ] `faqs`

### 1.2 Database Functions & Triggers
- [ ] Function + trigger `update_updated_at` (semua tabel)
- [ ] Function + trigger `handle_new_user` (auto create profile)
- [ ] Function + trigger `generate_order_number`
- [ ] Function + trigger `update_product_rating`

### 1.3 Indexes
- [ ] Buat semua index sesuai `database.md`

### 1.4 Row Level Security
- [ ] Enable RLS + buat policies untuk semua tabel
- [ ] Test RLS: user tidak bisa akses data user lain
- [ ] Test RLS: admin bisa akses semua data

### 1.5 Seed Data
- [ ] Insert data `settings` (store origin, free shipping threshold, dll)
- [ ] Insert data `categories` (8 kategori)
- [ ] Insert data `faqs` (minimal 5 FAQ)
- [ ] Buat akun admin via Supabase Auth
- [ ] Update role admin di tabel `profiles`

### 1.6 Seed Data Produk (Sinkronisasi dengan Tokopedia)
- [ ] Import / input minimal 10 produk sample dengan:
  - [ ] Nama, slug, deskripsi, kategori
  - [ ] Gambar (upload ke Supabase Storage)
  - [ ] Minimal 1 variant per produk (SKU, harga, stok, **berat**, dimensi)
  - [ ] Tags
- [ ] Verifikasi produk muncul di Supabase

---

## FASE 2 — Auth & User System

### 2.1 Supabase Auth Setup
- [ ] Setup Supabase client (browser + server + middleware)
- [ ] Buat `middleware.ts` untuk route protection:
  - [ ] `/dashboard/*` → redirect ke `/login` jika belum auth
  - [ ] `/admin/*` → redirect jika bukan role `admin`

### 2.2 Halaman Auth
- [ ] `/register` — form daftar + verifikasi email
- [ ] `/login` — email/password + Google OAuth + Cloudflare Turnstile
- [ ] `/forgot-password` — kirim link reset
- [ ] `/reset-password` — form password baru
- [ ] `/verify-email` — konfirmasi email

### 2.3 Zustand Auth Store
- [ ] `authStore` — simpan user session, role, profile

---

## FASE 3 — Layout & Design System

### 3.1 Design Tokens
- [ ] Setup Tailwind config: warna, font, spacing Swiss Style
- [ ] Setup dark mode (`next-themes`)
- [ ] Install & konfigurasi font (Google Fonts atau lokal)

### 3.2 Layout Komponen
- [ ] `Navbar` — logo, search, cart icon, user menu, notif bell
  - [ ] Mobile: hamburger menu + bottom nav
  - [ ] Desktop: full navbar
- [ ] `Footer` — link, sosmed, info toko
- [ ] `BottomNavBar` — mobile only (Home, Kategori, Cart, Akun)
- [ ] `WhatsAppButton` — floating button di semua halaman publik
- [ ] `AnnouncementBar` — ambil dari `settings` table
- [ ] `MaintenancePage` — cek `maintenance_mode` di settings

### 3.3 Shared Components
- [ ] `ProductCard` — gambar, nama, harga, rating, badge promo
- [ ] `SkeletonCard` — loading state
- [ ] `EmptyState` — cart kosong, wishlist kosong, dll
- [ ] `Toast` — via Sonner
- [ ] `ConfirmDialog` — sebelum hapus
- [ ] `Breadcrumb`
- [ ] `Pagination`
- [ ] `BackToTop` button
- [ ] `LoadingSpinner`

---

## FASE 4 — Halaman Publik

### 4.1 Homepage (`/`)
- [ ] Hero section (ambil dari `banners` table) + GSAP entrance
- [ ] Announcement bar
- [ ] Flash sale section (kalau ada yang aktif) + countdown timer
- [ ] Featured products
- [ ] Kategori grid
- [ ] Produk terbaru / terlaris
- [ ] WhatsApp CS button

### 4.2 List Produk (`/products`)
- [ ] Grid produk dengan filter:
  - [ ] Kategori, harga min-max, rating, stok
- [ ] Sort: terbaru, terlaris, harga naik/turun, rating
- [ ] Pagination / infinite scroll
- [ ] Search bar
- [ ] Breadcrumb

### 4.3 Kategori (`/category/[slug]`)
- [ ] Sama seperti list produk tapi filtered by kategori

### 4.4 Search (`/search`)
- [ ] Supabase full-text search
- [ ] Tampil jumlah hasil
- [ ] Filter & sort

### 4.5 Detail Produk (`/products/[slug]`)
- [ ] Image gallery + zoom + GSAP
- [ ] Nama, harga (coret jika ada sale), badge promo
- [ ] Pilih variant (warna, storage, dll)
- [ ] Stok indicator
- [ ] Quantity selector
- [ ] Tombol: Add to Cart, Beli Sekarang, Wishlist
- [ ] Estimasi berat & dimensi (untuk info user)
- [ ] Deskripsi produk
- [ ] Reviews & ratings
- [ ] Related products
- [ ] Share produk (WhatsApp, copy link)
- [ ] Recently viewed (simpan ke `product_views`)
- [ ] JSON-LD structured data (SEO rich snippet)

### 4.6 Static Pages (langsung coding, Swiss Style)
- [ ] `/about`
- [ ] `/contact`
- [ ] `/faq` (ambil dari `faqs` table)
- [ ] `/cara-belanja`
- [ ] `/kebijakan-pengembalian`
- [ ] `/kebijakan-privasi`
- [ ] `/syarat-ketentuan`

### 4.7 Tracking Publik
- [ ] `/track` — input nomor resi → tampil status Biteship
- [ ] `/cek-ongkir` — input kota asal-tujuan + berat → tampil ongkir

---

## FASE 5 — Cart & Checkout

### 5.1 Cart
- [ ] API route: get cart, add item, update qty, remove item, clear cart
- [ ] Sync cart ke database saat login
- [ ] CartDrawer (slide-in) + halaman `/cart`
- [ ] Zustand `cartStore`
- [ ] Cek stok saat tambah ke cart (`stock - reserved`)

### 5.2 Checkout Flow
- [ ] `/checkout` — form alamat, pilih kurir, input voucher
  - [ ] Pilih alamat tersimpan atau input baru
  - [ ] Hit Biteship API untuk check rates (realtime)
  - [ ] Tampil semua kurir + harga + estimasi
  - [ ] Toggle asuransi pengiriman
  - [ ] Input kode voucher → validasi ke API
  - [ ] Order notes (catatan untuk penjual)
  - [ ] Order summary (subtotal + ongkir + asuransi + diskon = total)
  - [ ] Reserve stok saat submit checkout

- [ ] `/checkout/payment` — tampil instruksi & Midtrans Snap
  - [ ] Countdown timer (sesuai `payment_timeout_hours` di settings)
  - [ ] Buka Midtrans Snap popup
  - [ ] Handle callback Snap (success, pending, error)

- [ ] `/checkout/success` — order berhasil
- [ ] `/checkout/pending` — menunggu pembayaran
- [ ] `/checkout/failed` — pembayaran gagal / retry

---

## FASE 6 — Payment (Midtrans)

- [ ] API route `POST /api/checkout` — buat order + payment record
- [ ] API route `POST /api/midtrans/token` — create Snap transaction token
- [ ] Webhook `POST /api/webhooks/midtrans`:
  - [ ] Verify signature (SHA512)
  - [ ] Idempotency check
  - [ ] Handle status `settlement` / `capture`:
    - [ ] Update payment status → `paid`
    - [ ] Update order status → `paid`
    - [ ] Kurangi stok + release reserved
    - [ ] Log `stock_history`
    - [ ] Log `order_status_history`
    - [ ] Trigger create shipment Biteship
    - [ ] Kirim email "Pembayaran berhasil" (Resend)
  - [ ] Handle status `pending` → update payment `pending`
  - [ ] Handle status `deny` / `cancel` → release reserved stok
  - [ ] Handle status `expire`:
    - [ ] Update payment → `expired`
    - [ ] Update order → `cancelled`
    - [ ] Release reserved stok
    - [ ] Kirim email "Order dibatalkan"
  - [ ] Handle status `challenge` → flag untuk admin review
  - [ ] Handle status `refund` → update payment `refunded`
- [ ] Retry payment untuk order expired

---

## FASE 7 — Shipping (Biteship)

- [ ] API route `POST /api/shipping/rates` — check ongkir
- [ ] API route `GET /api/shipping/track` — tracking by AWB
- [ ] Helper `createBiteshipOrder` — dipanggil setelah Midtrans settlement
- [ ] Simpan AWB & data shipment ke tabel `shipments`
- [ ] Webhook `POST /api/webhooks/biteship`:
  - [ ] Verify signature
  - [ ] Update `shipments.status` & `tracking_history`
  - [ ] Update `orders.status`:
    - [ ] `shipped` → kirim email "Paket dikirim" + AWB
    - [ ] `delivered` → kirim email "Paket tiba"
  - [ ] Log `order_status_history`

---

## FASE 8 — Dashboard User

- [x] Layout dashboard (sidebar + mobile responsive)
- [x] `/dashboard` — overview (total order, poin, notif)
- [x] `/dashboard/orders` — list order dengan filter status
- [x] `/dashboard/orders/[id]` — detail order + payment info
- [x] `/dashboard/orders/[id]/tracking` — tracking pengiriman realtime
- [x] `/dashboard/orders/[id]/invoice` — download PDF invoice
- [x] `/dashboard/orders/[id]/review` — form tulis ulasan
- [x] `/dashboard/orders/[id]/complaint` — form ajukan komplain
- [x] `/dashboard/wishlist` — list wishlist
- [x] `/dashboard/profile` — edit profil + foto
- [x] `/dashboard/addresses` — list alamat
- [x] `/dashboard/addresses/new` — tambah alamat
- [x] `/dashboard/addresses/[id]/edit` — edit alamat
- [x] `/dashboard/change-password` — ganti password
- [x] `/dashboard/notifications` — list notifikasi
- [x] `/dashboard/vouchers` — voucher tersedia

### Tambahan Dashboard
- [x] Tombol "Batalkan Order" (sebelum status `processing`)
- [x] Tombol "Konfirmasi Terima Barang" (status `delivered`)
- [x] Retry payment untuk order pending/expired
- [x] Riwayat transaksi gagal / expired

---

## FASE 9 — Admin Panel

### 9.1 Admin Auth
- [ ] `/admin/login` — login khusus admin
- [ ] Middleware: block non-admin dari `/admin/*`

### 9.2 Admin Dashboard
- [ ] `/admin` — overview stats:
  - [ ] Revenue hari ini / minggu / bulan
  - [ ] Total order + breakdown status
  - [ ] Pelanggan baru
  - [ ] Produk low stock
- [ ] Grafik revenue & order (chart)
- [ ] Tabel: order terbaru, pelanggan baru, ulasan terbaru
- [ ] Quick actions: proses pesanan, update stok

### 9.3 Kelola Produk
- [ ] `/admin/products` — list + search + filter
- [ ] `/admin/products/new` — form tambah produk:
  - [ ] Upload gambar (ke Supabase Storage)
  - [ ] Buat variants (SKU, harga, stok, berat, dimensi)
  - [ ] Pilih kategori, input tags
  - [ ] SEO fields
- [ ] `/admin/products/[id]/edit` — edit produk
- [ ] Toggle active/inactive produk
- [ ] Soft delete produk

### 9.4 Kelola Kategori
- [ ] `/admin/categories` — list + CRUD kategori
- [ ] Support parent-child kategori

### 9.5 Kelola Pesanan
- [ ] `/admin/orders` — list order + filter status + search
- [ ] `/admin/orders/[id]` — detail order:
  - [ ] Update status manual
  - [ ] Input AWB manual (fallback Biteship)
  - [ ] Lihat payment info
  - [ ] Lihat history status

### 9.6 Kelola Pelanggan
- [ ] `/admin/customers` — list + search
- [ ] `/admin/customers/[id]` — detail: profil, order history

### 9.7 Kelola Konten
- [ ] `/admin/reviews` — list + approve/reject ulasan
- [ ] `/admin/complaints` — list + proses komplain + admin note
- [ ] `/admin/banners` — CRUD banner / hero
- [ ] `/admin/flash-sale` — buat & kelola flash sale

### 9.8 Kelola Promo
- [ ] `/admin/coupons` — list kupon
- [ ] `/admin/coupons/new` — buat kupon baru (%, nominal, min belanja, dll)

### 9.9 Laporan & Stok
- [ ] `/admin/reports` — grafik revenue, best seller, konversi
- [ ] `/admin/reports/export` — export CSV/Excel: orders, customers, revenue
- [ ] `/admin/stock` — list stok per variant + alert low stock + history

### 9.10 Pengaturan
- [ ] `/admin/settings` — pengaturan umum toko
- [ ] `/admin/settings/shipping` — alamat origin, threshold free ongkir
- [ ] `/admin/settings/payment` — payment timeout, dll
- [ ] Toggle maintenance mode
- [ ] Kelola announcement bar
- [ ] Kelola FAQ

---

## FASE 10 — Email (Resend)

- [ ] Setup Resend + verifikasi domain
- [ ] Buat template email (React Email atau HTML):
  - [ ] Verifikasi email
  - [ ] Reset password
  - [ ] Konfirmasi order
  - [ ] Instruksi pembayaran (VA/QRIS/dll)
  - [ ] Pembayaran berhasil
  - [ ] Order diproses
  - [ ] Paket dikirim (+ AWB + link tracking)
  - [ ] Paket tiba
  - [ ] Order selesai (minta review)
  - [ ] Order dibatalkan
  - [ ] Refund diproses
  - [ ] Komplain diterima
  - [ ] Low stock alert → ke email admin
- [ ] Test semua email di sandbox

---

## FASE 11 — SEO & Performance

- [ ] Meta title + description di setiap halaman
- [ ] OG image per halaman (dynamic untuk produk)
- [ ] `sitemap.xml` — auto generate (Next.js built-in)
- [ ] `robots.txt`
- [ ] JSON-LD structured data di halaman produk
  (Product schema: name, price, stock, rating)
- [ ] ISR untuk halaman produk (`revalidate: 60`)
- [ ] SSG untuk halaman statis (About, FAQ, dll)
- [ ] Next.js Image optimization di semua gambar
- [ ] Lazy loading + blur placeholder

---

## FASE 12 — Analytics & Monitoring

- [ ] Setup Google Analytics 4
- [ ] Track GA4 events:
  - [ ] `view_item` — buka detail produk
  - [ ] `add_to_cart` — tambah ke cart
  - [ ] `begin_checkout` — mulai checkout
  - [ ] `add_payment_info` — pilih metode bayar
  - [ ] `purchase` — order berhasil
- [ ] Setup cron-job.org → ping `/api/ping` setiap 5 hari

---

## FASE 13 — Testing & QA

### Payment Flow
- [ ] Test checkout flow end-to-end (Midtrans sandbox)
- [ ] Test semua metode pembayaran (VA, GoPay, QRIS, minimarket)
- [ ] Test webhook Midtrans (settlement, expire, cancel)
- [ ] Test retry payment
- [ ] Test refund

### Shipping Flow
- [ ] Test check ongkir realtime (Biteship testing)
- [ ] Test create shipment order
- [ ] Test tracking
- [ ] Test webhook Biteship

### Auth & Security
- [ ] Test RLS: user tidak bisa akses data user lain
- [ ] Test protected routes
- [ ] Test rate limiting
- [ ] Test Cloudflare Turnstile

### UI/UX
- [ ] Test responsive di mobile (320px - 768px)
- [ ] Test dark mode
- [ ] Test semua empty states
- [ ] Test loading skeletons
- [ ] Test animasi GSAP
- [ ] Test 404 dan 500 page

---

## FASE 14 — Pre-Launch

- [ ] Ganti semua credential ke Production:
  - [ ] Midtrans Production keys
  - [ ] Biteship Production API key
  - [ ] Resend Production (domain verified)
  - [ ] Supabase (pertimbangkan upgrade ke Pro)
- [ ] Update env variables di Vercel (production)
- [ ] Test ulang semua flow di production environment
- [ ] Setup custom domain di Vercel
- [ ] Verifikasi SSL aktif
- [ ] Setup cron-job.org production ping
- [ ] Backup database Supabase
- [ ] Disable maintenance mode
- [ ] **LAUNCH** 🚀

---

## FASE 15 — Post-Launch

- [ ] Monitor Google Analytics
- [ ] Monitor Supabase logs
- [ ] Input semua 107 produk dari Tokopedia
- [ ] Kirim notif ke pelanggan existing (WA blast atau email)
- [ ] Monitor low stock alerts
- [ ] Evaluasi performa & bug setelah 1 minggu
- [ ] Pertimbangkan upgrade Supabase ke Pro bila traffic meningkat
