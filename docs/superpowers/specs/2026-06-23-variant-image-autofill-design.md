# Design: Foto Varian Produk & Autofill Data Varian

**Date:** 2026-06-23
**Status:** Approved

## Overview

Dua perbaikan di admin dashboard untuk pengelolaan varian produk:

1. Tiap varian (mayoritas varian = warna) dapat foto representatif sendiri, dipilih dari galeri foto produk yang sudah ada atau upload baru. Di halaman produk publik, klik varian otomatis ganti foto utama ke foto varian tersebut.
2. Saat admin menambah varian baru, data fisik (price, stock, weight, dimensi, is_active) otomatis ter-copy dari Varian 1 (master), supaya admin tidak input ulang data yang sama berkali-kali untuk tiap warna.

Tidak berlaku untuk: galeri foto penuh per varian (cuma 1 foto representatif), autofill dari produk induk (karena tabel `products` tidak punya kolom weight/dimensi).

---

## 1. Skema Database

```sql
ALTER TABLE product_variants
  ADD COLUMN image_id uuid REFERENCES product_images(id) ON DELETE SET NULL;
```

- FK ke `product_images`, bukan kolom URL terpisah — foto varian tetap merujuk ke satu sumber kebenaran (galeri produk), tidak disimpan dobel.
- `ON DELETE SET NULL` di level DB. Kewajiban "harus ada foto" di-enforce di level form (Zod), bukan constraint `NOT NULL` di DB — supaya penghapusan foto dari galeri tidak gagal/block.
- **Backfill data lama:** migration set `image_id` semua varian existing yang masih `NULL` ke foto dengan `is_primary = true` milik produknya masing-masing (one-time `UPDATE` di migration file, bukan kode aplikasi).

---

## 2. Form Admin — Variant Card (`product-form.tsx`)

Tiap variant card dapat field foto baru:

- **Thumbnail kecil** menampilkan foto yang sedang dipilih. Kalau belum ada → placeholder kosong dengan border merah (indikasi wajib diisi, sama pola validasi error field lain di form ini).
- **Tombol "Pilih dari galeri"** → popover/modal grid menampilkan semua foto di `images[]` (form state galeri produk, komponen sama style-nya dengan grid di `ImageUploader`). Klik salah satu foto → assign ke varian itu.
- **Tombol "Upload baru"** → reuse logic upload `ImageUploader` (`POST /api/admin/upload`, bucket `products`). Hasil upload: (a) ditambahkan ke `images[]` galeri produk, (b) langsung di-assign ke varian yang sedang diedit.
- Referensi disimpan di form state sebagai `image_url` (bukan `image_id`) — konsisten dengan `ImageUploader` yang mengidentifikasi tiap `ImageItem` lewat `url` (foto baru belum punya `id` DB sebelum disimpan).

### Schema & Validasi

```typescript
const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama varian wajib diisi"),
  sku: z.string().trim().min(1, "SKU wajib diisi"),
  price: z.number().min(0, "Harga tidak boleh negatif"),
  stock: z.number().min(0, "Stok tidak boleh negatif"),
  weight: z.number().min(1, "Berat minimal 1 gram"),
  length: z.number().min(0),
  width: z.number().min(0),
  height: z.number().min(0),
  is_active: z.boolean(),
  image_url: z.string().min(1, "Foto varian wajib diisi"), // baru
});
```

### Server Action (`createProduct` / `updateProduct`)

Urutan proses saat submit:

1. Upsert `product_images` dari `images[]` (sama seperti sekarang).
2. Bangun mapping `url → id` dari hasil upsert di atas.
3. Resolve `variant.image_url` → `image_id` lewat mapping tersebut.
4. Insert/update `product_variants` dengan `image_id` hasil resolve.

Kalau ada `image_url` varian yang tidak ketemu di mapping (race condition / bug), action gagal dengan error jelas (`"Foto varian tidak valid, coba upload ulang."`) — jangan insert varian dengan `image_id` salah/null secara diam-diam.

---

## 3. Autofill Data Varian Baru

Saat admin klik **"Tambah Varian"**:

- Field `price`, `stock`, `weight`, `length`, `width`, `height`, `is_active` di-copy dari **Varian 1** (`variants.0`) — selalu dari varian pertama di array, bukan dari varian terakhir yang sempat diedit. Varian 1 berfungsi sebagai "master" data fisik produk.
- Field `name`, `sku`, `image_url`, `id` dikosongkan/reset — ini yang wajib admin isi sendiri per varian (unik per warna).
- Berlaku di mode create maupun edit produk (form yang sama).

### Implementasi

```typescript
const addVariant = () => {
  const base = getValues("variants.0");
  append({
    ...base,
    id: undefined,
    name: "",
    sku: "",
    image_url: "",
  });
};
```

Menggantikan handler "Tambah Varian" yang sekarang append objek kosong/default statis.

**Edge case:** kalau Varian 1 sendiri belum diisi (masih default kosong), hasil copy juga kosong — tidak ada masalah, behavior sama seperti tanpa autofill.

---

## 4. Halaman Produk Publik — Auto-switch Foto saat Klik Varian

### Type changes

`lib/types/product-detail.ts`:

```typescript
export type ProductDetailImage = {
  id: string;        // baru
  url: string;
  alt: string | null;
  sortOrder: number;
};

export type ProductDetailVariant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  imageId: string | null; // baru
};
```

### Query

Query fetch detail produk (`page.tsx` / data layer terkait) ikut select `id` dari `product_images` dan `image_id` dari `product_variants`.

### Client-side switching (`product-detail-client.tsx`)

Tambahan logic di handler klik variant chip (sekitar baris 268-287, di tempat `variantId` di-set):

```typescript
const idx = images.findIndex((img) => img.id === variant.imageId);
if (idx !== -1) setImgIndex(idx);
```

- Reuse `setImgIndex` yang sudah ada untuk mekanisme thumbnail-click — tidak perlu state baru.
- Thumbnail strip otomatis ikut highlight foto aktif karena baca `imgIndex` yang sama.
- Kalau `imageId` tidak ketemu di `images` (data integrity issue), `idx` = -1 dan `imgIndex` dibiarkan apa adanya — tidak crash, cuma tidak switch foto.

---

## 5. Testing & Validasi

- **Migration:** jalankan backfill di environment dev dulu, cek tidak ada varian dengan `image_id NULL` setelah migration (kecuali produk yang juga tidak punya `product_images` sama sekali — kasus ini perlu dicek manual, log warning).
- **Admin form:**
  - Submit produk baru tanpa pilih foto varian → harus muncul error validasi per varian, tidak boleh tersimpan.
  - Pilih foto dari galeri existing → varian tersimpan dengan `image_id` yang benar.
  - Upload foto baru langsung dari variant card → foto muncul di galeri produk DAN langsung ter-assign ke varian itu.
  - Klik "Tambah Varian" setelah Varian 1 terisi penuh → field price/stock/weight/dimensi/is_active varian baru ikut terisi sama; name/sku/foto kosong.
  - Edit varian 2 (ubah price), lalu tambah varian 3 → varian 3 harus copy dari Varian 1 (bukan dari varian 2 yang baru diedit).
- **Halaman publik:**
  - Produk dengan 2+ varian, masing-masing foto beda → klik tiap varian, foto utama harus ganti sesuai dan thumbnail strip ikut highlight.
  - Produk dengan varian yang `imageId` tidak match foto manapun di galeri (data lama/rusak) → tidak crash, foto utama tetap di posisi sebelumnya.
