"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import type { BrandStoreCategoryOption, BrandStoreSortKey } from "@/lib/types/brand-store-catalog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORT_OPTIONS: { value: BrandStoreSortKey; label: string }[] = [
  { value: "latest", label: "Terbaru" },
  { value: "best_selling", label: "Terlaris" },
  { value: "price-asc", label: "Harga terendah" },
  { value: "price-desc", label: "Harga tertinggi" },
  { value: "name-asc", label: "Nama A–Z" },
  { value: "name-desc", label: "Nama Z–A" },
];

const pillSelectTriggerClass =
  "h-11 min-w-[10.5rem] rounded-full border-[#e0e0e0] bg-white text-sm text-[#1d1d1f] focus:ring-[#EA5329]/30";

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
          className="h-11 rounded-full border-[#e0e0e0] bg-[#fafafc] pr-12 text-sm text-[#1d1d1f] placeholder:text-[#7a7a7a] focus-visible:border-[#EA5329] focus-visible:ring-[#EA5329]/25"
          autoComplete="off"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#1d1d1f] text-white">
          <Search className="h-4 w-4" aria-hidden />
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <Select
          value={categoryId || "all"}
          onValueChange={(v) => {
            pushParams((p) => {
              if (v && v !== "all") p.set("category", v);
              else p.delete("category");
            });
          }}
        >
          <SelectTrigger className={pillSelectTriggerClass} aria-label="Kategori produk">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sort}
          onValueChange={(v) => {
            const key = v as BrandStoreSortKey;
            pushParams((p) => {
              if (key && key !== "latest") p.set("sort", key);
              else p.delete("sort");
            });
          }}
        >
          <SelectTrigger className={pillSelectTriggerClass} aria-label="Urutkan">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
