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
    .select("id, code, type, value, min_purchase, max_discount, max_usage, is_active, valid_from, valid_until")
    .eq("id", id)
    .single();

  if (!coupon) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-6 lg:p-8">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link href="/admin/coupons" className="admin-text-link font-medium">
          <span className="inline-flex items-center gap-1">
            <ChevronLeft size={14} />
            Kupon
          </span>
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <span className="font-semibold text-foreground">Edit {coupon.code}</span>
      </nav>

      <div>
        <p className="text-swiss-eyebrow">Pemasaran</p>
        <h1 className="text-[34px] font-semibold uppercase text-foreground">Edit Kupon</h1>
        <p className="mt-1 font-mono text-[17px] leading-[1.47] text-muted-foreground">{coupon.code}</p>
      </div>

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
  );
}
