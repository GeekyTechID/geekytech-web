"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { ORDER_STATUS_FILTER_OPTIONS, type OrderStatus } from "@/lib/constants/order-status-labels";
import { cn } from "@/lib/utils";

const selectClass =
  "h-10 cursor-pointer rounded-lg border border-[#e0e0e0] bg-white px-3 text-sm text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#EA5329]/30";

function buildUrl(status: string, q: string, page?: number) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q.trim()) params.set("q", q.trim());
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/dashboard/orders?${qs}` : "/dashboard/orders";
}

export function DashboardOrdersFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") ?? "") as OrderStatus | "";
  const q = searchParams.get("q") ?? "";
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = (newStatus: string, newQ: string) => {
    router.push(buildUrl(newStatus, newQ));
  };

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Search */}
      <form
        className="relative flex-1 sm:max-w-xs"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(status, inputRef.current?.value ?? "");
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
        <input
          ref={inputRef}
          type="search"
          defaultValue={q}
          placeholder="Cari nomor pesanan…"
          className="h-10 w-full rounded-lg border border-[#e0e0e0] bg-white pl-9 pr-9 text-sm text-[#1d1d1f] outline-none placeholder:text-[#aaa] focus:ring-2 focus:ring-[#EA5329]/30"
        />
        {q && (
          <button
            type="button"
            aria-label="Hapus pencarian"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              navigate(status, "");
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a7a7a] hover:text-[#1d1d1f]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Status filter */}
      <label className="sr-only" htmlFor="user-order-status">
        Filter status pesanan
      </label>
      <select
        id="user-order-status"
        value={status}
        onChange={(e) => navigate(e.target.value, inputRef.current?.value ?? q)}
        className={cn(selectClass, "w-full sm:w-auto sm:min-w-[14rem]")}
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
