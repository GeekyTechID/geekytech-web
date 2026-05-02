"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Edit, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { formatRupiah, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toggleCouponActive, deleteCoupon } from "../_actions";

export type CouponRow = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_purchase: number;
  max_discount: number | null;
  max_usage: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
};

function getCouponStatus(coupon: CouponRow): { label: string; className: string } {
  if (!coupon.is_active) {
    return { label: "Nonaktif", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" };
  }
  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { label: "Terjadwal", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { label: "Kadaluarsa", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" };
  }
  if (coupon.max_usage !== null && coupon.used_count >= coupon.max_usage) {
    return { label: "Habis", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" };
  }
  return { label: "Aktif", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
}

function CouponActions({ coupon }: { coupon: CouponRow }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const { error } = await toggleCouponActive(coupon.id, !coupon.is_active);
      if (error) toast.error(error);
      else toast.success(coupon.is_active ? "Kupon dinonaktifkan." : "Kupon diaktifkan.");
    });
  };

  const handleDelete = () => {
    if (!confirm("Hapus kupon ini? Tindakan tidak bisa dibatalkan.")) return;
    startTransition(async () => {
      const { error } = await deleteCoupon(coupon.id);
      if (error) toast.error(error);
      else toast.success("Kupon dihapus.");
    });
  };

  const status = getCouponStatus(coupon);

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/admin/coupons/${coupon.id}/edit`}
        className="inline-flex p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Edit kupon"
      >
        <Edit size={14} />
      </Link>
      <button
        onClick={handleDelete}
        disabled={isPending}
        title="Hapus kupon"
        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
      >
        <Trash2 size={14} />
      </button>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "h-6 px-2 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50",
          status.className
        )}
      >
        {status.label}
      </button>
    </div>
  );
}

interface CouponTableProps {
  coupons: CouponRow[];
}

export function CouponTable({ coupons }: CouponTableProps) {
  if (coupons.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 border border-dashed border-border py-20 text-muted-foreground">
        <Ticket size={36} strokeWidth={1} />
        <p className="text-sm font-bold uppercase tracking-widest">Belum ada kupon</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Kode
            </th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:table-cell">
              Diskon
            </th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground md:table-cell">
              Min. Belanja
            </th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground lg:table-cell">
              Pemakaian
            </th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground lg:table-cell">
              Berlaku
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((coupon) => {
            const status = getCouponStatus(coupon);
            const discountLabel =
              coupon.type === "percentage"
                ? `${coupon.value}%${coupon.max_discount ? ` (maks ${formatRupiah(coupon.max_discount)})` : ""}`
                : formatRupiah(coupon.value);

            return (
              <tr
                key={coupon.id}
                className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <span className="font-mono font-bold tracking-wider">{coupon.code}</span>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="text-xs font-medium">{discountLabel}</span>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {coupon.min_purchase > 0 ? formatRupiah(coupon.min_purchase) : "—"}
                  </span>
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {coupon.used_count}
                    {coupon.max_usage !== null ? ` / ${coupon.max_usage}` : " / ∞"}
                  </span>
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <span className="text-xs text-muted-foreground">
                    {coupon.valid_from || coupon.valid_until
                      ? `${coupon.valid_from ? formatDate(coupon.valid_from) : "—"} → ${coupon.valid_until ? formatDate(coupon.valid_until) : "—"}`
                      : "Tidak terbatas"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                      status.className
                    )}
                  >
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <CouponActions coupon={coupon} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
