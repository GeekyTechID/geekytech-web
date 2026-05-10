"use client";

import { useCallback, useRef } from "react";
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
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const hasFilters = q || status !== "all";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative max-w-md flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Cari nama kategori..."
          defaultValue={q}
          onChange={(e) => {
            const val = e.target.value;
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = setTimeout(() => {
              searchDebounceRef.current = null;
              updateParam("q", val);
            }, 400);
          }}
          className="h-11 rounded-full border-[#e0e0e0] bg-card pl-10 pr-4 text-[17px] leading-[1.47] dark:border-border"
        />
      </div>

      <div className="flex overflow-hidden rounded-lg border border-[#e0e0e0] dark:border-border">
        {STATUS_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => updateParam("status", value === "all" ? "" : value)}
            className={cn(
              "h-11 border-r border-[#e0e0e0] px-4 text-xs font-semibold uppercase tracking-widest transition-colors last:border-r-0 dark:border-border",
              (value === "all" ? status === "all" : status === value)
                ? "bg-brand/10 text-brand"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-dashed border-[#e0e0e0] px-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand dark:border-border"
        >
          <X size={12} />
          Reset
        </button>
      )}
    </div>
  );
}
