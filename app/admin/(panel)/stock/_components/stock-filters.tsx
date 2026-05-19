"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = { id: string; name: string };
type Brand = { id: string; name: string };

interface StockFiltersProps {
  categories: Category[];
  brands: Brand[];
}

const DEFAULT_SORT = "stock-asc";

export function StockFilters({ categories, brands }: StockFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = searchParams.get("q") ?? "";
  const brandId = searchParams.get("brand") ?? "";
  const categoryId = searchParams.get("category") ?? "";
  const sort = searchParams.get("sort") ?? DEFAULT_SORT;
  const alertOnly = searchParams.get("alert") === "1";

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
    const params = new URLSearchParams();
    if (alertOnly) params.set("alert", "1");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const hasFilters = Boolean(q) || Boolean(brandId) || Boolean(categoryId) || sort !== DEFAULT_SORT;

  const sortOptions = [
    { value: "stock-asc", label: "Stok Terendah" },
    { value: "stock-desc", label: "Stok Tertinggi" },
    { value: "product-asc", label: "Nama Produk A-Z" },
    { value: "product-desc", label: "Nama Produk Z-A" },
    { value: "name-asc", label: "Varian A-Z" },
    { value: "name-desc", label: "Varian Z-A" },
    { value: "sku-asc", label: "SKU A-Z" },
    { value: "sku-desc", label: "SKU Z-A" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-0 flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Cari produk, varian, atau SKU..."
          defaultValue={q}
          onChange={(e) => {
            const val = e.target.value;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => updateParam("q", val), 400);
          }}
          className="h-11 rounded-full border-[#e0e0e0] pl-10 text-[17px] leading-[1.47] dark:border-border"
        />
      </div>

      {brands.length > 0 ? (
        <Select
          value={brandId || "__all__"}
          onValueChange={(v) => updateParam("brand", v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="w-[13rem] shrink-0">
            <SelectValue placeholder="Semua Merek" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Semua Merek</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {categories.length > 0 ? (
        <Select
          value={categoryId || "__all__"}
          onValueChange={(v) => updateParam("category", v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="w-[13rem] shrink-0">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Semua Kategori</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Select
        value={sort}
        onValueChange={(v) => updateParam("sort", v === DEFAULT_SORT ? "" : v)}
      >
        <SelectTrigger className="w-[13rem] shrink-0">
          <SelectValue placeholder="Urutkan" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 gap-1.5 border-dashed text-muted-foreground"
          onClick={clearAll}
        >
          <X size={12} />
          Reset
        </Button>
      ) : null}
    </div>
  );
}
