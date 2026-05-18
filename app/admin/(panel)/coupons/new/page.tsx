import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";

import { CouponForm } from "../_components/coupon-form";

export const metadata: Metadata = { title: "Buat Kupon — Admin GeekyTech" };

export default function AdminNewCouponPage() {
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
        <span className="font-semibold text-foreground">Buat Kupon</span>
      </nav>

      <div>
        <p className="text-swiss-eyebrow">Pemasaran</p>
        <h1 className="text-[34px] font-semibold uppercase text-foreground">Buat Kupon</h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">Tambahkan kode diskon untuk pelanggan.</p>
      </div>

      <CouponForm />
    </div>
  );
}
