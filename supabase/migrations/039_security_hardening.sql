-- 039: Security hardening (RLS + Storage + functions)
--
-- Anon key bersifat publik, jadi user yang login bisa memanggil PostgREST langsung
-- tanpa lewat aplikasi. Policy lama terlalu longgar di beberapa tabel:
--   * profiles  : user bisa UPDATE kolom role sendiri → jadi admin.
--   * orders    : user bisa UPDATE semua kolom pesanannya (status, total, …) dan
--                 INSERT pesanan sendiri.
--   * product_reviews : user bisa membuka kembali ulasan yang dihapus admin, ulasan
--                 tanpa membeli produk.
--   * coupon_usages : user bisa DELETE pemakaian kupon → kupon dipakai ulang.
--   * complaints / complaint_messages : user bisa ubah status / menyamar admin.
--   * storage products & coupons : semua user login bisa upload/hapus.
--   * fungsi SECURITY DEFINER bisa dipanggil anon lewat /rest/v1/rpc.
--
-- Guard trigger memakai current_user: request PostgREST berjalan sebagai role
-- anon/authenticated/service_role; trigger internal (SECURITY DEFINER) & cron
-- berjalan sebagai postgres. Service role dan admin selalu lolos.

-- ── 1. profiles: role & deleted_at hanya bisa diubah admin/service ─────────
CREATE OR REPLACE FUNCTION public.guard_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'customer';
    NEW.deleted_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'Tidak diizinkan mengubah kolom ini' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_columns ON public.profiles;
CREATE TRIGGER guard_profile_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_columns();

-- ── 2. orders: pelanggan hanya boleh batal / konfirmasi terima ──────────────
CREATE OR REPLACE FUNCTION public.guard_order_customer_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY['status', 'updated_at', 'refund_bank_name', 'refund_account_name', 'refund_account_number'];
  refund_changed boolean;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - allowed) IS DISTINCT FROM (to_jsonb(OLD) - allowed) THEN
    RAISE EXCEPTION 'Tidak diizinkan mengubah pesanan' USING ERRCODE = '42501';
  END IF;

  refund_changed := NEW.refund_bank_name IS DISTINCT FROM OLD.refund_bank_name
    OR NEW.refund_account_name IS DISTINCT FROM OLD.refund_account_name
    OR NEW.refund_account_number IS DISTINCT FROM OLD.refund_account_number;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status IN ('pending_payment', 'paid') AND NEW.status = 'cancelled')
      OR (OLD.status = 'delivered' AND NEW.status = 'completed')
    ) THEN
      RAISE EXCEPTION 'Perubahan status tidak diizinkan' USING ERRCODE = '42501';
    END IF;
    -- Rekening refund hanya diisi bersamaan dengan pembatalan.
    IF refund_changed AND NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'Tidak diizinkan mengubah rekening refund' USING ERRCODE = '42501';
    END IF;
  ELSIF refund_changed THEN
    RAISE EXCEPTION 'Tidak diizinkan mengubah rekening refund' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_order_customer_update ON public.orders;
CREATE TRIGGER guard_order_customer_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_order_customer_update();

-- Checkout membuat pesanan & item lewat service role (app/api/checkout/create).
DROP POLICY IF EXISTS orders_insert_own ON public.orders;
DROP POLICY IF EXISTS order_items_insert_own ON public.order_items;
DROP POLICY IF EXISTS orders_insert_admin ON public.orders;
CREATE POLICY orders_insert_admin ON public.orders FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS order_items_insert_admin ON public.order_items;
CREATE POLICY order_items_insert_admin ON public.order_items FOR INSERT WITH CHECK (public.is_admin());

-- ── 3. product_reviews: hanya untuk produk yang dibeli; moderasi milik admin ─
CREATE OR REPLACE FUNCTION public.guard_review_customer_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE o.id = NEW.order_id
        AND o.user_id = auth.uid()
        AND o.status IN ('delivered', 'completed')
        AND pv.product_id = NEW.product_id
    ) THEN
      RAISE EXCEPTION 'Ulasan hanya untuk produk yang sudah diterima' USING ERRCODE = '42501';
    END IF;
    NEW.deleted_at := NULL;
    NEW.is_approved := true;
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.is_approved IS DISTINCT FROM OLD.is_approved
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'Tidak diizinkan mengubah kolom ini' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_review_customer_write ON public.product_reviews;
CREATE TRIGGER guard_review_customer_write
  BEFORE INSERT OR UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_review_customer_write();

-- ── 4. coupon_usages: pelanggan hanya bisa melihat ─────────────────────────
DROP POLICY IF EXISTS coupon_usages_all_own ON public.coupon_usages;
DROP POLICY IF EXISTS coupon_usages_select_own ON public.coupon_usages;
CREATE POLICY coupon_usages_select_own ON public.coupon_usages
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS coupon_usages_write_admin ON public.coupon_usages;
CREATE POLICY coupon_usages_write_admin ON public.coupon_usages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 5. complaints & complaint_messages ─────────────────────────────────────
DROP POLICY IF EXISTS complaints_all_own ON public.complaints;
DROP POLICY IF EXISTS complaints_select_own ON public.complaints;
CREATE POLICY complaints_select_own ON public.complaints
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS complaints_insert_own ON public.complaints;
CREATE POLICY complaints_insert_own ON public.complaints
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND status = 'open'
    AND admin_note IS NULL
    AND resolved_at IS NULL
    AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );
DROP POLICY IF EXISTS complaints_write_admin ON public.complaints;
CREATE POLICY complaints_write_admin ON public.complaints
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS complaint_messages_all_own ON public.complaint_messages;
DROP POLICY IF EXISTS complaint_messages_select_own ON public.complaint_messages;
CREATE POLICY complaint_messages_select_own ON public.complaint_messages
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM complaints c WHERE c.id = complaint_id AND c.user_id = auth.uid())
  );
DROP POLICY IF EXISTS complaint_messages_insert_own ON public.complaint_messages;
CREATE POLICY complaint_messages_insert_own ON public.complaint_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'user'
    AND EXISTS (SELECT 1 FROM complaints c WHERE c.id = complaint_id AND c.user_id = auth.uid())
  );
DROP POLICY IF EXISTS complaint_messages_write_admin ON public.complaint_messages;
CREATE POLICY complaint_messages_write_admin ON public.complaint_messages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 6. Storage: produk & kupon hanya admin; media komplain di folder order sendiri ─
DROP POLICY IF EXISTS "products bucket admin insert" ON storage.objects;
DROP POLICY IF EXISTS "products bucket admin update" ON storage.objects;
DROP POLICY IF EXISTS "products bucket admin delete" ON storage.objects;
CREATE POLICY "products bucket admin insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'products' AND public.is_admin());
CREATE POLICY "products bucket admin update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'products' AND public.is_admin());
CREATE POLICY "products bucket admin delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'products' AND public.is_admin());

DROP POLICY IF EXISTS "Admin full access coupons" ON storage.objects;
CREATE POLICY "Admin full access coupons" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'coupons' AND public.is_admin())
  WITH CHECK (bucket_id = 'coupons' AND public.is_admin());

DROP POLICY IF EXISTS auth_upload_complaint_images ON storage.objects;
CREATE POLICY auth_upload_complaint_images ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'complaint-images'
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1] AND o.user_id = auth.uid()
    )
  );

-- ── 7. Fungsi: tutup akses RPC publik ──────────────────────────────────────
-- toggle_chat_reaction menerima p_user_id dari pemanggil (bisa menyamar) dan tidak
-- dipakai aplikasi. Fungsi trigger/cron tidak perlu dipanggil lewat RPC.
-- is_admin() tetap executable karena dipakai di policy RLS.
REVOKE EXECUTE ON FUNCTION public.toggle_chat_reaction(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_product_rating(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_pending_payment_orders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_product_rating_from_review() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_complaint_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_chat_session_on_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_product_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profile_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_order_customer_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_review_customer_write() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.generate_order_number() SET search_path = public;
ALTER FUNCTION public.update_product_rating() SET search_path = public;
ALTER FUNCTION public.update_chat_session_on_message() SET search_path = public;
ALTER FUNCTION public.generate_complaint_number() SET search_path = public;
