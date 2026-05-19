"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative min-w-0 flex-1">
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

      {/* Status */}
      <Select
        value={status || "all"}
        onValueChange={(v) => updateParam("status", v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-[13rem] shrink-0">
          <SelectValue placeholder="Semua Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Kondisi */}
      <Select
        value={condition || "all"}
        onValueChange={(v) => updateParam("condition", v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-[13rem] shrink-0">
          <SelectValue placeholder="Semua Kondisi" />
        </SelectTrigger>
        <SelectContent>
          {conditionOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {brands.length > 0 && (
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
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {categories.length > 0 && (
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
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={sort}
        onValueChange={(v) => updateParam("sort", v === "latest" ? "" : v)}
      >
        <SelectTrigger className="w-[13rem] shrink-0">
          <SelectValue placeholder="Urutkan" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
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
      )}
    </div>
  );
}
