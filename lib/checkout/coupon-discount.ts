import type { Database } from "@/types/supabase";

type CouponRow = Pick<
  Database["public"]["Tables"]["coupons"]["Row"],
  "id" | "code" | "type" | "value" | "min_purchase" | "max_discount" | "valid_from" | "valid_until" | "used_count" | "max_usage" | "is_active"
>;

export type CouponValidationOk = {
  couponId: string;
  code: string;
  discountAmount: number;
};

export function computeCouponDiscount(subtotal: number, coupon: CouponRow): { ok: true; data: CouponValidationOk } | { ok: false; error: string } {
  if (!coupon.is_active) {
    return { ok: false, error: "Kupon tidak aktif." };
  }
  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { ok: false, error: "Kupon belum berlaku." };
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { ok: false, error: "Kupon sudah kedaluwarsa." };
  }
  if (subtotal < Number(coupon.min_purchase)) {
    return {
      ok: false,
      error: `Minimal belanja ${Number(coupon.min_purchase).toLocaleString("id-ID")} untuk kupon ini.`,
    };
  }
  if (coupon.max_usage != null && coupon.used_count >= coupon.max_usage) {
    return { ok: false, error: "Kuota kupon habis." };
  }

  let discount = 0;
  if (coupon.type === "percentage") {
    discount = Math.floor((subtotal * Number(coupon.value)) / 100);
    if (coupon.max_discount != null) {
      discount = Math.min(discount, Number(coupon.max_discount));
    }
  } else {
    discount = Math.min(Math.floor(Number(coupon.value)), Math.floor(subtotal));
  }

  if (discount <= 0) {
    return { ok: false, error: "Nilai diskon tidak valid." };
  }

  return {
    ok: true,
    data: { couponId: coupon.id, code: coupon.code, discountAmount: discount },
  };
}
