"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

export function CategoryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const hasFilters = q || status !== "all";

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nama kategori..."
          defaultValue={q}
          onChange={(e) => {
            const val = e.target.value;
            const tid = setTimeout(() => updateParam("q", val), 400);
            return () => clearTimeout(tid);
          }}
          className="rounded-none pl-8 h-9 text-sm"
        />
      </div>

      {/* Status */}
      <div className="flex border border-border">
        {STATUS_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParam("status", value === "all" ? "" : value)}
            className={cn(
              "px-4 h-11 text-xs font-bold uppercase tracking-widest border-r border-border last:border-r-0 transition-colors",
              (value === "all" ? status === "all" : status === value)
                ? "bg-swiss-black text-swiss-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
          className="flex items-center gap-1.5 h-11 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground border border-dashed border-border transition-colors"
        >
          <X size={12} />
          Reset
        </button>
      )}
    </div>
  );
}
