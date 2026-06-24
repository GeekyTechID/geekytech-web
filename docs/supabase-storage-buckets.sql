-- GeekyTech — Storage buckets (FASE 0.3)
-- Jalankan di Supabase Dashboard → SQL Editor → Run.
-- Aman dijalankan ulang: ON CONFLICT tidak mengubah bucket yang sudah ada.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('products', 'products', true),
  ('avatars', 'avatars', false),
  ('complaints', 'complaints', false),
  ('invoices', 'invoices', false),
  ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;
