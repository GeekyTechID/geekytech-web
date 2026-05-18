"use client";

import { useRouter } from "next/navigation";

import { ORDER_STATUS_FILTER_OPTIONS, type OrderStatus } from "@/lib/constants/order-status-labels";
import type { StoreHeaderCategoryRow } from "@/lib/data/store-header-server";
import { cn } from "@/lib/utils";

const selectClass =
  "h-10 w-full min-w-0 cursor-pointer rounded-lg border border-[#e0e0e0] bg-white px-3 text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#EA5329]/30 sm:w-auto sm:min-w-[10.5rem] md:min-w-[11.5rem]";

type DashboardOverviewFiltersProps = {
  categories: StoreHeaderCategoryRow[];
  className?: string;
};

export function DashboardOverviewFilters({ categories, className }: DashboardOverviewFiltersProps) {
  const router = useRouter();

  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end sm:justify-end sm:gap-3",
        className,
      )}
    >
      <div className="flex min-w-0 w-full flex-col gap-1.5 sm:w-auto sm:min-w-[10.5rem]">
        <span className="text-xs font-semibold uppercase text-[#7a7a7a]">Status pesanan</span>
        <label className="sr-only" htmlFor="overview-order-status">
          Status pesanan
        </label>
        <select
          id="overview-order-status"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as OrderStatus | "";
            router.push(v ? `/dashboard/orders?status=${encodeURIComponent(v)}` : "/dashboard/orders");
          }}
          className={cn(selectClass, "sm:min-w-[12.5rem]")}
        >
          {ORDER_STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {categories.length > 0 ? (
        <div className="flex min-w-0 w-full flex-col gap-1.5 sm:w-auto sm:min-w-[10.5rem]">
          <span className="text-xs font-semibold uppercase text-[#7a7a7a]">Kategori produk</span>
          <label className="sr-only" htmlFor="overview-category">
            Kategori produk
          </label>
          <select
            id="overview-category"
            defaultValue=""
            onChange={(e) => {
              const slug = e.target.value;
              router.push(slug ? `/products?category=${encodeURIComponent(slug)}` : "/products");
            }}
            className={cn(selectClass, "sm:min-w-[11.5rem]")}
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
