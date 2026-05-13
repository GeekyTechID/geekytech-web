"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { ORDER_STATUS_FILTER_OPTIONS, type OrderStatus } from "@/lib/constants/order-status-labels";
import { cn } from "@/lib/utils";

const selectClass =
  "h-10 min-w-[12rem] cursor-pointer rounded-lg border border-[#e0e0e0] bg-white px-3 text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#EA5329]/30";

export function DashboardOrdersFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") ?? "") as OrderStatus | "";

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <label className="sr-only" htmlFor="user-order-status">
        Filter status pesanan
      </label>
      <select
        id="user-order-status"
        value={status}
        onChange={(e) => {
          const v = e.target.value as OrderStatus | "";
          router.push(v ? `/dashboard/orders?status=${encodeURIComponent(v)}` : "/dashboard/orders");
        }}
        className={cn(selectClass, "min-w-[14rem]")}
      >
        {ORDER_STATUS_FILTER_OPTIONS.map((opt) => (
          <option key={opt.value || "all"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
