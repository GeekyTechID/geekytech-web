"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string };
type Brand = { id: string; name: string };

interface ProductFiltersProps {
  categories: Category[];
  brands?: Brand[];
}

export function ProductFilters({ categories, brands = [] }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const condition = searchParams.get("condition") ?? "all";
  const brandId = searchParams.get("brand") ?? "";
  const categoryId = searchParams.get("category") ?? "";
  const sort = searchParams.get("sort") ?? "latest";

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

  const hasFilters = q || status !== "all" || condition !== "all" || brandId || categoryId || sort !== "latest";

  const statusOptions = [
    { value: "all", label: "Semua Status" },
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Nonaktif" },
  ];

  const conditionOptions = [
    { value: "all", label: "Semua Kondisi" },
    { value: "new", label: "Baru" },
    { value: "second", label: "Second" },
  ];

  const sortOptions = [
    { value: "latest", label: "Terbaru" },
    { value: "oldest", label: "Terlama" },
    { value: "name-asc", label: "Nama A-Z" },
    { value: "name-desc", label: "Nama Z-A" },
    { value: "price-asc", label: "Harga Termurah" },
    { value: "price-desc", label: "Harga Termahal" },
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
          className="rounded-none pl-8 h-11 text-sm"
        />
      </div>

      {/* Status filter */}
      <div className="flex border border-border">
        {statusOptions.map(({ value, label }) => (
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

      {/* Condition filter */}
      <div className="flex border border-border">
        {conditionOptions.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParam("condition", value === "all" ? "" : value)}
            className={cn(
              "px-4 h-11 text-xs font-bold uppercase tracking-widest border-r border-border last:border-r-0 transition-colors",
              (value === "all" ? condition === "all" : condition === value)
                ? "bg-swiss-black text-swiss-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Brand filter */}
      {brands.length > 0 && (
        <select
          value={brandId}
          onChange={(e) => updateParam("brand", e.target.value)}
          className="h-11 border border-border bg-background text-sm px-2 rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-foreground w-auto cursor-pointer"
        >
          <option value="">Semua Merek</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}

      {/* Category filter */}
      {categories.length > 0 && (
        <select
          value={categoryId}
          onChange={(e) => updateParam("category", e.target.value)}
          className="h-11 border border-border bg-background text-sm px-2 rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-foreground cursor-pointer"
        >
          <option value="">Semua Kategori</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      )}

      {/* Sort */}
      <select
        value={sort}
        onChange={(e) => updateParam("sort", e.target.value === "latest" ? "" : e.target.value)}
        className="h-11 border border-border bg-background text-sm px-2 rounded-none text-foreground focus:outline-none focus:ring-1 focus:ring-foreground w-auto cursor-pointer"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 h-11 px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground border border-dashed border-border transition-colors"
        >
          <X size={12} />
          Reset
        </button>
      )}
    </div>
  );
}
