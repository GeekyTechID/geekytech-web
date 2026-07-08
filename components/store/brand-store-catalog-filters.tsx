"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListFilter, Search, X } from "lucide-react";

import { FilterDropdown } from "@/components/shared/filter-dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { BrandStoreCategoryOption, BrandStoreSortKey } from "@/lib/types/brand-store-catalog";

const SORT_OPTIONS: { value: BrandStoreSortKey; label: string }[] = [
  { value: "latest", label: "Terbaru" },
  { value: "best_selling", label: "Terlaris" },
  { value: "price-asc", label: "Harga terendah" },
  { value: "price-desc", label: "Harga tertinggi" },
  { value: "name-asc", label: "Nama A–Z" },
  { value: "name-desc", label: "Nama Z–A" },
];

const filterTriggerClass = "h-11 min-h-11 w-full rounded-md bg-white sm:w-auto";

type BrandStoreCatalogFiltersProps = {
  categories: BrandStoreCategoryOption[];
  totalCount: number;
};

function buildQueryString(params: URLSearchParams): string {
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function BrandStoreCatalogFilters({ categories, totalCount }: BrandStoreCatalogFiltersProps) {
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
    { value: "", label: "Kategori" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const hasFilters = Boolean(categoryId || sort !== "latest");

  const clearAll = useCallback(() => {
    pushParams((p) => {
      p.delete("category");
      p.delete("sort");
    });
  }, [pushParams]);

  const filterControls = (
    <FilterDropdown
      aria-label="Kategori produk"
      className={filterTriggerClass}
      value={categoryId}
      options={categoryOptions}
      active={Boolean(categoryId)}
      onValueChange={(v) =>
        pushParams((p) => {
          if (v) p.set("category", v);
          else p.delete("category");
        })
      }
    />
  );

  const sortSelect = (
    <div className="flex shrink-0 items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">Urutkan:</span>
      <Select
        value={sort}
        onValueChange={(v) =>
          pushParams((p) => {
            if (v && v !== "latest") p.set("sort", v);
            else p.delete("sort");
          })
        }
      >
        <SelectTrigger
          aria-label="Urutkan produk"
          className="w-auto gap-1.5 rounded-none border-0 bg-transparent p-0 font-semibold text-foreground shadow-none hover:bg-transparent focus-visible:border-0 focus-visible:ring-0"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative min-w-0 sm:max-w-xl">
        <label htmlFor="brand-catalog-search" className="sr-only">
          Cari produk
        </label>
        <div className="flex h-11 items-center rounded-md border border-[#e0e0e0] bg-[#fafafc] pl-4 pr-3 focus-within:border-[#1d1d1f]">
          <Search className="mr-2 h-4 w-4 shrink-0 text-[#7a7a7a]" aria-hidden />
          <Input
            id="brand-catalog-search"
            type="search"
            value={qInput}
            onChange={(e) => scheduleSearch(e.target.value)}
            placeholder="Cari produkmu di sini..."
            className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-[#1d1d1f] shadow-none placeholder:text-[#7a7a7a] focus-visible:ring-0"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button type="button" variant="dark" size="default" className="relative shrink-0 sm:hidden">
                <ListFilter className="h-4 w-4" />
                Filter
                {hasFilters ? (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-brand" aria-hidden />
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Filter</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-4">{filterControls}</div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button type="button" variant="primary" className="w-full">
                    Tampilkan hasil
                  </Button>
                </SheetClose>
                {hasFilters ? (
                  <Button type="button" variant="ghost" className="w-full" onClick={clearAll}>
                    Hapus semua filter
                  </Button>
                ) : null}
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* display:contents — kontrol jadi flex item langsung dari baris di atas, biar filter+reset satu baris di sm+ */}
          <div className="hidden sm:contents">
            {filterControls}
            {hasFilters ? (
              <Button
                type="button"
                variant="pearl"
                size="sm"
                className="shrink-0 gap-1.5 border-dashed text-muted-foreground"
                onClick={clearAll}
              >
                <X size={12} />
                Reset
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-4 sm:gap-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{totalCount}</span> produk ditemukan
          </p>
          {sortSelect}
        </div>
      </div>
    </div>
  );
}
