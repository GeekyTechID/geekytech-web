import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { CouponForm } from "../../_components/coupon-form";

export const metadata: Metadata = { title: "Edit Kupon — Admin GeekyTech" };
export const dynamic = "force-dynamic";

export default async function AdminEditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: coupon } = await supabase
    .from("coupons")
    .select(
      "id, code, type, value, min_purchase, max_discount, max_usage, is_active, valid_from, valid_until"
    )
    .eq("id", id)
    .single();

  if (!coupon) notFound();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/coupons"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
          Kupon
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-black uppercase tracking-tight">Edit {coupon.code}</h1>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <CouponForm
          initialData={{
            id: coupon.id,
            code: coupon.code,
            type: coupon.type as "percentage" | "fixed",
            value: coupon.value,
            min_purchase: coupon.min_purchase ?? 0,
            max_discount: coupon.max_discount ?? null,
            max_usage: coupon.max_usage ?? null,
            is_active: coupon.is_active,
            valid_from: coupon.valid_from ?? null,
            valid_until: coupon.valid_until ?? null,
          }}
        />
      </div>
    </div>
  );
}
