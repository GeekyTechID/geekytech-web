"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string };

interface ProductFiltersProps {
  categories: Category[];
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const categoryId = searchParams.get("category") ?? "";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clearAll = () => {
    router.push(pathname);
  };

  const hasFilters = q || status !== "all" || categoryId;

  const statusOptions = [
    { value: "all", label: "Semua Status" },
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Nonaktif" },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nama produk..."
          defaultValue={q}
          onChange={(e) => {
            const val = e.target.value;
            const id = setTimeout(() => updateParam("q", val), 400);
            return () => clearTimeout(id);
          }}
          className="rounded-none pl-8 h-9 text-sm"
        />
      </div>

      {/* Status filter */}
      <div className="flex border border-border">
        {statusOptions.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParam("status", value === "all" ? "" : value)}
            className={cn(
              "px-3 h-9 text-xs font-bold uppercase tracking-widest border-r border-border last:border-r-0 transition-colors",
              (value === "all" ? status === "all" : status === value)
                ? "bg-swiss-black text-swiss-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <select
          value={categoryId}
          onChange={(e) => updateParam("category", e.target.value)}
          className="h-9 border border-border bg-background text-sm px-2 rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
        >
          <option value="">Semua Kategori</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      )}

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground border border-dashed border-border transition-colors"
        >
          <X size={12} />
          Reset
        </button>
      )}
    </div>
  );
}
