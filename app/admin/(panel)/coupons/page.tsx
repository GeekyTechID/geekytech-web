import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { CouponTable, type CouponRow } from "./_components/coupon-table";

export const metadata: Metadata = { title: "Kupon — Admin GeekyTech" };
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const supabase = await createClient();

  const { data: coupons } = await supabase
    .from("coupons")
    .select(
      "id, code, type, value, min_purchase, max_discount, max_usage, used_count, is_active, valid_from, valid_until, created_at"
    )
    .order("created_at", { ascending: false });

  const rows: CouponRow[] = (coupons ?? []) as CouponRow[];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Kupon</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {rows.length} kupon
          </p>
        </div>
        <Link
          href="/admin/coupons/new"
          className="flex items-center gap-2 h-9 px-4 bg-swiss-black text-swiss-white text-xs font-black uppercase tracking-widest transition-opacity"
        >
          <Plus size={14} />
          Buat Kupon
        </Link>
      </div>

      {/* Table */}
      <CouponTable coupons={rows} />
    </div>
  );
}
