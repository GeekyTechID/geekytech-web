# GeekyTech — Database Architecture

## Stack
- **Platform**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (tabel `auth.users` sudah built-in)
- **Storage**: Supabase Storage (untuk gambar produk & assets)
- **Security**: Row Level Security (RLS) wajib di semua tabel

---

## Aturan Umum

1. Semua tabel wajib punya kolom `created_at` dan `updated_at`
2. Gunakan `uuid` sebagai primary key di semua tabel
3. Gunakan `soft delete` dengan kolom `deleted_at` di tabel utama
4. Semua foreign key wajib pakai `ON DELETE CASCADE` atau `ON DELETE SET NULL` sesuai konteks
5. Aktifkan RLS di semua tabel tanpa terkecuali
6. Buat index di kolom yang sering di-query (slug, user_id, order_id, status)
7. Gunakan `timestamptz` untuk semua kolom datetime
8. Enum status pakai PostgreSQL `type` agar konsisten

---

## Tabel & Struktur

### 1. `profiles`
Extend dari `auth.users` Supabase.

```sql
id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
full_name   text
phone       text
avatar_url  text
role        text DEFAULT 'customer' -- 'customer' | 'admin'
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
deleted_at  timestamptz -- soft delete
```

### 2. `addresses`
Multiple alamat per user, bisa set default.

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id       uuid REFERENCES profiles(id) ON DELETE CASCADE
label         text -- 'Rumah', 'Kantor', dll
recipient     text NOT NULL
phone         text NOT NULL
province      text NOT NULL
city          text NOT NULL
district      text NOT NULL
postal_code   text NOT NULL
full_address  text NOT NULL
is_default    boolean DEFAULT false
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()
```

### 3. `categories`
Kategori produk, support parent-child (nested).

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text NOT NULL
slug        text UNIQUE NOT NULL
image_url   text
parent_id   uuid REFERENCES categories(id) ON DELETE SET NULL
sort_order  integer DEFAULT 0
is_active   boolean DEFAULT true
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

### 4. `products`
Data utama produk.

```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
name              text NOT NULL
slug              text UNIQUE NOT NULL
description       text
category_id       uuid REFERENCES categories(id) ON DELETE SET NULL
base_price        numeric(12,2) NOT NULL
sale_price        numeric(12,2) -- harga coret, NULL jika tidak diskon
is_featured       boolean DEFAULT false
is_active         boolean DEFAULT true
min_order_qty     integer DEFAULT 1
total_sold        integer DEFAULT 0
average_rating    numeric(3,2) DEFAULT 0
review_count      integer DEFAULT 0
meta_title        text -- SEO
meta_description  text -- SEO
created_at        timestamptz DEFAULT now()
updated_at        timestamptz DEFAULT now()
deleted_at        timestamptz -- soft delete
```

### 5. `product_images`
Gallery gambar per produk.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
product_id  uuid REFERENCES products(id) ON DELETE CASCADE
url         text NOT NULL
alt_text    text
sort_order  integer DEFAULT 0
is_primary  boolean DEFAULT false
created_at  timestamptz DEFAULT now()
```

### 6. `product_variants`
Variant produk (warna, storage, tipe, dll). Stok, berat, dimensi per variant.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
product_id  uuid REFERENCES products(id) ON DELETE CASCADE
name        text NOT NULL -- misal: '128GB - Hitam'
sku         text UNIQUE NOT NULL
price       numeric(12,2) NOT NULL -- bisa override base_price
stock       integer DEFAULT 0
reserved    integer DEFAULT 0 -- stok yang sedang di-checkout
weight      integer NOT NULL -- gram, wajib untuk Biteship
length      integer DEFAULT 0 -- cm
width       integer DEFAULT 0 -- cm
height      integer DEFAULT 0 -- cm
is_active   boolean DEFAULT true
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

> **Catatan**: `reserved` bertambah saat user checkout, berkurang saat payment expire/cancel atau order confirmed. Stok aktual = `stock - reserved`.

### 7. `product_tags`
Tags untuk SEO dan filter.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
product_id  uuid REFERENCES products(id) ON DELETE CASCADE
tag         text NOT NULL
```

### 8. `product_views`
Tracking views untuk "recently viewed" dan analytics.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
product_id  uuid REFERENCES products(id) ON DELETE CASCADE
user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL -- NULL jika guest
session_id  text -- untuk guest tracking
viewed_at   timestamptz DEFAULT now()
```

### 9. `product_reviews`
Ulasan dan rating produk oleh user yang sudah beli.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
product_id  uuid REFERENCES products(id) ON DELETE CASCADE
order_id    uuid REFERENCES orders(id) ON DELETE SET NULL
user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE
rating      integer NOT NULL CHECK (rating >= 1 AND rating <= 5)
comment     text
is_approved boolean DEFAULT true
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
deleted_at  timestamptz
```

### 10. `wishlists`
Wishlist per user.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE
product_id  uuid REFERENCES products(id) ON DELETE CASCADE
created_at  timestamptz DEFAULT now()
UNIQUE(user_id, product_id)
```

### 11. `carts`
Cart persistent di database (bukan localStorage).

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

### 12. `cart_items`
Item di dalam cart.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
cart_id     uuid REFERENCES carts(id) ON DELETE CASCADE
variant_id  uuid REFERENCES product_variants(id) ON DELETE CASCADE
quantity    integer NOT NULL DEFAULT 1
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
UNIQUE(cart_id, variant_id)
```

### 13. `coupons`
Voucher / kode kupon promo.

```sql
id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
code              text UNIQUE NOT NULL
type              text NOT NULL -- 'percentage' | 'fixed'
value             numeric(12,2) NOT NULL -- persen atau nominal
min_purchase      numeric(12,2) DEFAULT 0
max_discount      numeric(12,2) -- cap untuk tipe percentage
max_usage         integer -- NULL = unlimited
used_count        integer DEFAULT 0
is_active         boolean DEFAULT true
valid_from        timestamptz
valid_until       timestamptz
created_at        timestamptz DEFAULT now()
updated_at        timestamptz DEFAULT now()
```

### 14. `coupon_usages`
Tracking pemakaian kupon per user.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
coupon_id   uuid REFERENCES coupons(id) ON DELETE CASCADE
user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE
order_id    uuid REFERENCES orders(id) ON DELETE CASCADE
used_at     timestamptz DEFAULT now()
UNIQUE(coupon_id, user_id) -- 1 kupon max 1x per user (sesuaikan jika perlu)
```

### 15. `orders`
Data utama pesanan.

```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
order_number        text UNIQUE NOT NULL -- format: GT-20240101-XXXX
user_id             uuid REFERENCES profiles(id) ON DELETE SET NULL
status              order_status NOT NULL DEFAULT 'pending_payment'
-- Snapshot alamat saat checkout (jangan FK, karena alamat bisa diedit)
recipient_name      text NOT NULL
recipient_phone     text NOT NULL
shipping_province   text NOT NULL
shipping_city       text NOT NULL
shipping_district   text NOT NULL
shipping_postal     text NOT NULL
shipping_address    text NOT NULL
-- Pricing
subtotal            numeric(12,2) NOT NULL
shipping_cost       numeric(12,2) NOT NULL DEFAULT 0
shipping_insurance  numeric(12,2) DEFAULT 0
discount_amount     numeric(12,2) DEFAULT 0
total               numeric(12,2) NOT NULL
-- Kurir
courier_company     text -- 'jne', 'jnt', 'sicepat', dll
courier_service     text -- 'REG', 'YES', dll
courier_etd         text -- estimasi tiba
-- Catatan
notes               text
coupon_id           uuid REFERENCES coupons(id) ON DELETE SET NULL
coupon_code         text -- snapshot kode kupon
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
```

**PostgreSQL Enum untuk order_status:**
```sql
CREATE TYPE order_status AS ENUM (
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refunded'
);
```

### 16. `order_items`
Item di dalam order (snapshot harga saat checkout).

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
order_id      uuid REFERENCES orders(id) ON DELETE CASCADE
variant_id    uuid REFERENCES product_variants(id) ON DELETE SET NULL
product_name  text NOT NULL -- snapshot
variant_name  text NOT NULL -- snapshot
sku           text NOT NULL -- snapshot
price         numeric(12,2) NOT NULL -- snapshot harga saat beli
quantity      integer NOT NULL
subtotal      numeric(12,2) NOT NULL
weight        integer NOT NULL -- snapshot gram
image_url     text -- snapshot
```

### 17. `order_status_history`
Audit trail setiap perubahan status order.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
order_id    uuid REFERENCES orders(id) ON DELETE CASCADE
status      order_status NOT NULL
note        text -- bisa diisi admin
changed_by  uuid REFERENCES profiles(id) ON DELETE SET NULL
created_at  timestamptz DEFAULT now()
```

### 18. `payments`
Data transaksi pembayaran via Midtrans.

```sql
id                    uuid PRIMARY KEY DEFAULT gen_random_uuid()
order_id              uuid REFERENCES orders(id) ON DELETE CASCADE
midtrans_order_id     text UNIQUE NOT NULL -- order_id yang dikirim ke Midtrans
midtrans_transaction_id text -- dapat dari webhook
payment_type          text -- 'bank_transfer', 'gopay', 'qris', dll
status                payment_status NOT NULL DEFAULT 'pending'
gross_amount          numeric(12,2) NOT NULL
va_number             text -- untuk virtual account
payment_code          text -- untuk minimarket
pdf_url               text -- URL struk Midtrans
expiry_time           timestamptz
paid_at               timestamptz
raw_response          jsonb -- simpan raw webhook payload
created_at            timestamptz DEFAULT now()
updated_at            timestamptz DEFAULT now()
```

**PostgreSQL Enum untuk payment_status:**
```sql
CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'expired',
  'cancelled',
  'refunded',
  'challenge'
);
```

### 19. `shipments`
Data pengiriman via Biteship.

```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
order_id            uuid REFERENCES orders(id) ON DELETE CASCADE
biteship_order_id   text -- ID order di Biteship
awb                 text -- nomor resi
courier_company     text NOT NULL
courier_service     text NOT NULL
courier_name        text -- nama kurir (display)
status              shipment_status NOT NULL DEFAULT 'pending'
tracking_history    jsonb DEFAULT '[]' -- array history tracking
estimated_delivery  text
picked_up_at        timestamptz
delivered_at        timestamptz
raw_response        jsonb
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()
```

**PostgreSQL Enum untuk shipment_status:**
```sql
CREATE TYPE shipment_status AS ENUM (
  'pending',
  'confirmed',
  'allocated',
  'picking_up',
  'picked',
  'dropping_off',
  'delivered',
  'rejected',
  'cancelled',
  'returned'
);
```

### 20. `notifications`
In-app notifications per user.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE
title       text NOT NULL
body        text NOT NULL
type        text NOT NULL -- 'order', 'promo', 'system'
data        jsonb -- payload tambahan (order_id, dll)
is_read     boolean DEFAULT false
created_at  timestamptz DEFAULT now()
```

### 21. `banners`
Banner / hero section yang dikelola admin.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
title       text
subtitle    text
image_url   text NOT NULL
link_url    text
is_active   boolean DEFAULT true
sort_order  integer DEFAULT 0
starts_at   timestamptz
ends_at     timestamptz
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

### 22. `flash_sales`
Flash sale dengan countdown timer.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text NOT NULL
starts_at   timestamptz NOT NULL
ends_at     timestamptz NOT NULL
is_active   boolean DEFAULT true
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

### 23. `flash_sale_products`
Produk yang masuk flash sale.

```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
flash_sale_id   uuid REFERENCES flash_sales(id) ON DELETE CASCADE
variant_id      uuid REFERENCES product_variants(id) ON DELETE CASCADE
sale_price      numeric(12,2) NOT NULL
quota           integer NOT NULL -- max qty yang bisa dibeli dalam flash sale
sold            integer DEFAULT 0
```

### 24. `complaints`
Retur & komplain dari user.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
order_id    uuid REFERENCES orders(id) ON DELETE CASCADE
user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE
type        text NOT NULL -- 'retur' | 'komplain'
reason      text NOT NULL
description text
images      jsonb DEFAULT '[]' -- array URL foto bukti
status      text DEFAULT 'open' -- 'open' | 'processing' | 'resolved' | 'rejected'
admin_note  text
resolved_at timestamptz
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

### 25. `stock_history`
Log setiap perubahan stok.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
variant_id  uuid REFERENCES product_variants(id) ON DELETE CASCADE
type        text NOT NULL -- 'in' | 'out' | 'reserved' | 'released' | 'adjustment'
quantity    integer NOT NULL -- positif atau negatif
note        text
order_id    uuid REFERENCES orders(id) ON DELETE SET NULL
changed_by  uuid REFERENCES profiles(id) ON DELETE SET NULL
created_at  timestamptz DEFAULT now()
```

### 26. `settings`
Pengaturan toko (key-value store).

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
key         text UNIQUE NOT NULL
value       jsonb NOT NULL
updated_at  timestamptz DEFAULT now()
```

**Contoh data settings:**
```sql
-- Alamat origin toko (untuk Biteship)
INSERT INTO settings (key, value) VALUES
('store_origin', '{
  "name": "GeekyTech",
  "phone": "08xxxxxxxxxx",
  "province": "DKI Jakarta",
  "city": "Jakarta Selatan",
  "district": "Kebayoran Baru",
  "postal_code": "12160",
  "address": "Jl. Contoh No. 1"
}'::jsonb),
-- Threshold free ongkir
('free_shipping_threshold', '200000'::jsonb),
-- Maintenance mode
('maintenance_mode', 'false'::jsonb),
-- WhatsApp CS
('whatsapp_cs', '"6281234567890"'::jsonb),
-- Auto complete order setelah X hari
('auto_complete_days', '7'::jsonb),
-- Payment timeout (jam)
('payment_timeout_hours', '3'::jsonb),
-- Announcement bar
('announcement_bar', '{
  "text": "Selamat datang di GeekyTech!",
  "is_active": false
}'::jsonb);
```

### 27. `faqs`
FAQ yang dikelola dari admin.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
question    text NOT NULL
answer      text NOT NULL
category    text -- 'pengiriman', 'pembayaran', 'retur', dll
sort_order  integer DEFAULT 0
is_active   boolean DEFAULT true
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

---

## Indexes yang Wajib Dibuat

```sql
-- Products
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);

-- Product variants
CREATE INDEX idx_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);

-- Orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Payments
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_midtrans_order_id ON payments(midtrans_order_id);

-- Shipments
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_awb ON shipments(awb);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

---

## Row Level Security (RLS) Policies

### profiles
```sql
-- User hanya bisa lihat & edit profil sendiri
-- Admin bisa lihat semua
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "User can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### products
```sql
-- Semua orang bisa lihat produk aktif
-- Hanya admin yang bisa insert/update/delete
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Admin can manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### orders
```sql
-- User hanya bisa lihat order sendiri
-- Admin bisa lihat semua
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all orders"
  ON orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### carts & cart_items
```sql
-- User hanya bisa akses cart sendiri
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can manage own cart"
  ON carts FOR ALL
  USING (auth.uid() = user_id);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can manage own cart items"
  ON cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE id = cart_items.cart_id AND user_id = auth.uid()
    )
  );
```

> Terapkan pola yang sama untuk tabel lain: addresses, wishlists, notifications, complaints, dll.

---

## Functions & Triggers

### Auto update `updated_at`
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Terapkan ke semua tabel yang punya updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- (ulangi untuk tabel lain)
```

### Auto create profile setelah register
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Auto generate order number
```sql
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number = 'GT-' ||
    TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    UPPER(SUBSTRING(gen_random_uuid()::text, 1, 6));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();
```

### Auto update product rating setelah review
```sql
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM product_reviews
      WHERE product_id = NEW.product_id AND deleted_at IS NULL
    ),
    review_count = (
      SELECT COUNT(*)
      FROM product_reviews
      WHERE product_id = NEW.product_id AND deleted_at IS NULL
    )
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_review_insert
  AFTER INSERT OR UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION update_product_rating();
```

---

## Seed Data (Data Awal)

### Kategori
```sql
INSERT INTO categories (name, slug, sort_order) VALUES
('Smartphone', 'smartphone', 1),
('Laptop', 'laptop', 2),
('Tablet', 'tablet', 3),
('Audio', 'audio', 4),
('Aksesori', 'aksesori', 5),
('Smartwatch', 'smartwatch', 6),
('Gaming', 'gaming', 7),
('Kamera', 'kamera', 8);
```

### Admin User
```sql
-- Setelah register via Supabase Auth, update role via:
UPDATE profiles SET role = 'admin' WHERE id = 'uuid-admin-user';
```

---

## Supabase Storage Buckets

```
products    → gambar produk (public)
avatars     → foto profil user (private)
complaints  → foto bukti komplain (private)
invoices    → PDF invoice (private)
banners     → gambar banner (public)
```

---

## Catatan Penting

1. **Jangan pernah expose `SUPABASE_SERVICE_ROLE_KEY` ke client** — hanya di server/API routes
2. **RLS harus aktif di semua tabel** sebelum go production
3. **Snapshot data penting di order_items** — nama produk, harga, berat tidak boleh FK murni karena produk bisa berubah
4. **Reserved stock** harus di-release via cron atau webhook jika payment expire
5. **Midtrans webhook** dan **Biteship webhook** harus verify signature sebelum proses apapun
