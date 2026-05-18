"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { ORDER_STATUS_FILTER_OPTIONS, type OrderStatus } from "@/lib/constants/order-status-labels";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrderSortOption } from "@/lib/data/dashboard-user";

type Category = { id: string; name: string; slug: string };

type Props = {
  categories?: Category[];
  sort?: OrderSortOption;
};

const SORT_OPTIONS: { value: OrderSortOption; label: string }[] = [
  { value: "newest",     label: "Terbaru" },
  { value: "oldest",     label: "Terlama" },
  { value: "total_desc", label: "Total tertinggi" },
  { value: "total_asc",  label: "Total terendah" },
];

function buildUrl(status: string, q: string, category: string, sort: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q.trim()) params.set("q", q.trim());
  if (category) params.set("category", category);
  if (sort && sort !== "newest") params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/dashboard/orders?${qs}` : "/dashboard/orders";
}

export function DashboardOrdersFilters({ categories = [], sort: sortProp = "newest" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") ?? "") as OrderStatus | "";
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const sort = (searchParams.get("sort") ?? sortProp) as OrderSortOption;
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = (newStatus: string, newQ: string, newCategory: string, newSort: string) => {
    router.push(buildUrl(newStatus, newQ, newCategory, newSort));
  };

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Search */}
      <form
        className="relative flex-1 sm:max-w-xs"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(status, inputRef.current?.value ?? "", category, sort);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
        <input
          ref={inputRef}
          type="text"
          defaultValue={q}
          placeholder="Cari nomor pesanan atau nama produk…"
          className="h-10 w-full rounded-lg border border-[#e0e0e0] bg-white pl-9 pr-8 text-sm text-[#1d1d1f] outline-none placeholder:text-[#aaa] focus:ring-2 focus:ring-[#EA5329]/30"
        />
        {q && (
          <button
            type="button"
            aria-label="Hapus pencarian"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              navigate(status, "", category, sort);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a7a7a] hover:text-[#1d1d1f]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Status filter */}
      <Select
        value={status || "__all__"}
        onValueChange={(v) => navigate(v === "__all__" ? "" : v, inputRef.current?.value ?? q, category, sort)}
      >
        <SelectTrigger className="w-full sm:w-[13rem]">
          <SelectValue placeholder="Semua status" />
        </SelectTrigger>
        <SelectContent>
          {ORDER_STATUS_FILTER_OPTIONS.map((opt) => (
            <SelectItem key={opt.value || "__all__"} value={opt.value || "__all__"}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Category filter */}
      {categories.length > 0 && (
        <Select
          value={category || "__all__"}
          onValueChange={(v) => navigate(status, inputRef.current?.value ?? q, v === "__all__" ? "" : v, sort)}
        >
          <SelectTrigger className="w-full sm:w-[13rem]">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Semua kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Sort */}
      <Select
        value={sort}
        onValueChange={(v) => navigate(status, inputRef.current?.value ?? q, category, v)}
      >
        <SelectTrigger className="w-full sm:w-[13rem]">
          <SelectValue placeholder="Urutkan" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
