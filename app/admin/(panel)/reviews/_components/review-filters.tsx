"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
];

const RATING_OPTIONS = [
  { value: "all", label: "Semua Rating" },
  { value: "5", label: "★ 5" },
  { value: "4", label: "★ 4" },
  { value: "3", label: "★ 3" },
  { value: "2", label: "★ 2" },
  { value: "1", label: "★ 1" },
];

export function ReviewFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const rating = searchParams.get("rating") ?? "all";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const hasFilters = q || status !== "all" || rating !== "all";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {/* Search */}
      <div className="relative max-w-xs flex-1">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Cari nama pelanggan / produk..."
          defaultValue={q}
          onChange={(e) => {
            const val = e.target.value;
            const tid = setTimeout(() => updateParam("q", val), 400);
            return () => clearTimeout(tid);
          }}
          className="h-9 rounded-none pl-8 text-sm"
        />
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap border border-border">
        {STATUS_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParam("status", value)}
            className={cn(
              "h-9 border-r border-border px-3 text-xs font-bold uppercase tracking-widest transition-colors last:border-r-0",
              status === value || (value === "all" && status === "all")
                ? "bg-swiss-black text-swiss-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Rating filter */}
      <div className="flex flex-wrap border border-border">
        {RATING_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParam("rating", value)}
            className={cn(
              "h-9 border-r border-border px-3 text-xs font-bold uppercase tracking-widest transition-colors last:border-r-0",
              rating === value
                ? "bg-swiss-black text-swiss-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={() => router.push(pathname)}
          className="flex h-9 items-center gap-1.5 border border-dashed border-border px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={12} />
          Reset
        </button>
      )}
    </div>
  );
}
