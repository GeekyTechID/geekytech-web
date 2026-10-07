-- Bukti transfer refund manual (Mayar tidak punya API refund).
--
-- Additive only (aman untuk production yang masih jalan dengan kode lama).
-- Bucket PRIVAT: bukti transfer memuat nama & nomor rekening pelanggan.
-- Upload hanya lewat app/api/admin/refund-proof (service role, cek admin),
-- dibaca lewat signed URL yang dibuat server setelah cek akses pesanan,
-- jadi bucket tidak butuh policy storage untuk user.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refund_proof_path text,
  ADD COLUMN IF NOT EXISTS refund_reference text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'refund-proofs',
  'refund-proofs',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
