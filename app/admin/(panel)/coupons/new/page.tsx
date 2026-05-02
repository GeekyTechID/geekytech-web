import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";

import { CouponForm } from "../_components/coupon-form";

export const metadata: Metadata = { title: "Buat Kupon — Admin GeekyTech" };

export default function AdminNewCouponPage() {
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
        <h1 className="text-2xl font-black uppercase tracking-tight">Buat Kupon</h1>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <CouponForm />
      </div>
    </div>
  );
}
