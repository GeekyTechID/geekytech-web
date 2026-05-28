"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { FilterDropdown } from "@/components/shared/filter-dropdown";
import type { BrandStoreCategoryOption, BrandStoreSortKey } from "@/lib/types/brand-store-catalog";
import { Input } from "@/components/ui/input";

const SORT_OPTIONS: { value: BrandStoreSortKey; label: string }[] = [
  { value: "latest", label: "Terbaru" },
  { value: "best_selling", label: "Terlaris" },
  { value: "price-asc", label: "Harga terendah" },
  { value: "price-desc", label: "Harga tertinggi" },
  { value: "name-asc", label: "Nama A–Z" },
  { value: "name-desc", label: "Nama Z–A" },
];

const brandFilterTriggerClass =
  "h-11 min-h-11 rounded-full bg-white sm:min-w-[10.5rem] sm:w-auto";

type BrandStoreCatalogFiltersProps = {
  categories: BrandStoreCategoryOption[];
};

function buildQueryString(params: URLSearchParams): string {
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function BrandStoreCatalogFilters({ categories }: BrandStoreCatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialQ = searchParams.get("q") ?? "";
  const [qInput, setQInput] = useState(initialQ);

  useEffect(() => {
    setQInput(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const pushParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      next.delete("page");
      router.push(`${pathname}${buildQueryString(next)}`);
    },
    [router, pathname, searchParams],
  );

  const scheduleSearch = useCallback(
    (value: string) => {
      setQInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        pushParams((p) => {
          if (value.trim()) p.set("q", value.trim());
          else p.delete("q");
        });
      }, 320);
    },
    [pushParams],
  );

  const categoryId = searchParams.get("category") ?? "";
  const sort = (searchParams.get("sort") ?? "latest") as BrandStoreSortKey;

  const categoryOptions = [
    { value: "all", label: "Semua kategori" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
      <div className="relative min-w-0 flex-1 sm:max-w-xl">
        <label htmlFor="brand-catalog-search" className="sr-only">
          Cari produk
        </label>
        <Input
          id="brand-catalog-search"
          type="search"
          value={qInput}
          onChange={(e) => scheduleSearch(e.target.value)}
          placeholder="Cari produkmu di sini..."
          className="h-11 rounded-full border-[#e0e0e0] bg-[#fafafc] pr-12 text-sm text-[#1d1d1f] placeholder:text-[#7a7a7a] focus-visible:border-[#1d1d1f] focus-visible:ring-[#1d1d1f]/15"
          autoComplete="off"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#1d1d1f] text-white">
          <Search className="h-4 w-4" aria-hidden />
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <FilterDropdown
          aria-label="Kategori produk"
          className={brandFilterTriggerClass}
          value={categoryId || "all"}
          options={categoryOptions}
          onValueChange={(v) => {
            pushParams((p) => {
              if (v && v !== "all") p.set("category", v);
              else p.delete("category");
            });
          }}
        />

        <FilterDropdown
          aria-label="Urutkan"
          className={brandFilterTriggerClass}
          value={sort}
          options={SORT_OPTIONS}
          onValueChange={(v) => {
            const key = v as BrandStoreSortKey;
            pushParams((p) => {
              if (key && key !== "latest") p.set("sort", key);
              else p.delete("sort");
            });
          }}
        />
      </div>
    </div>
  );
}
