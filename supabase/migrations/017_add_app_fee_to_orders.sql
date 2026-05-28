-- ============================================================
-- 017_add_app_fee_to_orders.sql
-- Tambah kolom app_fee ke tabel orders.
-- Order lama mendapat default 0 (fee belum diimplementasi).
-- ============================================================

ALTER TABLE orders
  ADD COLUMN app_fee numeric(12,2) NOT NULL DEFAULT 0;
