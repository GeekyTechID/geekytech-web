"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string };
type Brand = { id: string; name: string };

interface ProductFiltersProps {
  categories: Category[];
  brands?: Brand[];
}

const selectClass =
  "h-10 cursor-pointer rounded-lg border border-[#e0e0e0] bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-border";

export function ProductFilters({ categories, brands = [] }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const condition = searchParams.get("condition") ?? "all";
  const brandId = searchParams.get("brand") ?? "";
  const categoryId = searchParams.get("category") ?? "";
  const sort = searchParams.get("sort") ?? "latest";

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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

  const clearAll = () => {
    router.push(pathname);
  };

  const hasFilters =
    Boolean(q) ||
    status !== "all" ||
    condition !== "all" ||
    Boolean(brandId) ||
    Boolean(categoryId) ||
    sort !== "latest";

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
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Cari nama produk..."
          defaultValue={q}
          onChange={(e) => {
            const val = e.target.value;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => updateParam("q", val), 400);
          }}
          className="h-11 rounded-full border-[#e0e0e0] pl-10 text-[17px] leading-[1.47] dark:border-border"
        />
      </div>

      <div className="flex flex-col flex-wrap gap-3 xl:flex-row xl:items-center">
        <div className="inline-flex max-w-full flex-wrap overflow-hidden rounded-lg border border-[#e0e0e0] dark:border-border">
          {statusOptions.map(({ value, label }, i) => (
            <button
              key={value}
              type="button"
              onClick={() => updateParam("status", value === "all" ? "" : value)}
              className={cn(
                "h-10 border-[#e0e0e0] px-3 text-xs font-semibold uppercase tracking-widest transition-colors dark:border-border",
                i > 0 ? "border-l" : "",
                (value === "all" ? status === "all" : status === value)
                  ? "bg-brand/10 text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="inline-flex max-w-full flex-wrap overflow-hidden rounded-lg border border-[#e0e0e0] dark:border-border">
          {conditionOptions.map(({ value, label }, i) => (
            <button
              key={value}
              type="button"
              onClick={() => updateParam("condition", value === "all" ? "" : value)}
              className={cn(
                "h-10 border-[#e0e0e0] px-3 text-xs font-semibold uppercase tracking-widest transition-colors dark:border-border",
                i > 0 ? "border-l" : "",
                (value === "all" ? condition === "all" : condition === value)
                  ? "bg-brand/10 text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {brands.length > 0 ? (
          <select
            value={brandId}
            onChange={(e) => updateParam("brand", e.target.value)}
            className={cn(selectClass, "min-w-[10rem]")}
          >
            <option value="">Semua Merek</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        ) : null}

        {categories.length > 0 ? (
          <select
            value={categoryId}
            onChange={(e) => updateParam("category", e.target.value)}
            className={cn(selectClass, "min-w-[10rem]")}
          >
            <option value="">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        ) : null}

        <select
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value === "latest" ? "" : e.target.value)}
          className={cn(selectClass, "min-w-[11rem]")}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {hasFilters ? (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-[#e0e0e0] px-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground dark:border-border"
          >
            <X size={12} />
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
