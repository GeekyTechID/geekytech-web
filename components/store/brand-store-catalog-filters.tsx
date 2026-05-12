"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";

import type { BrandStoreCategoryOption, BrandStoreSortKey } from "@/lib/types/brand-store-catalog";

const SORT_OPTIONS: { value: BrandStoreSortKey; label: string }[] = [
  { value: "latest", label: "Terbaru" },
  { value: "best_selling", label: "Terlaris" },
  { value: "price-asc", label: "Harga terendah" },
  { value: "price-desc", label: "Harga tertinggi" },
  { value: "name-asc", label: "Nama A–Z" },
  { value: "name-desc", label: "Nama Z–A" },
];

const pillSelectClass =
  "h-11 w-full min-w-[10.5rem] cursor-pointer appearance-none rounded-full border border-[#e0e0e0] bg-white pl-4 pr-11 text-sm text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#EA5329]/30";

type PillSelectProps = {
  id: string;
  ariaLabel: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
};

function PillSelect({ id, ariaLabel, value, onChange, children }: PillSelectProps) {
  return (
    <div className="relative min-w-[10.5rem] shrink-0">
      <select id={id} aria-label={ariaLabel} className={pillSelectClass} value={value} onChange={onChange}>
        {children}
      </select>
      <span
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#1d1d1f]"
        aria-hidden
      >
        <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={2} />
      </span>
    </div>
  );
}

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
        <input
          id="brand-catalog-search"
          type="search"
          value={qInput}
          onChange={(e) => scheduleSearch(e.target.value)}
          placeholder="Cari produkmu di sini..."
          className="h-11 w-full rounded-full border border-[#e0e0e0] bg-[#fafafc] py-2 pl-4 pr-12 text-sm text-[#1d1d1f] placeholder:text-[#7a7a7a] focus:border-[#EA5329] focus:outline-none focus:ring-2 focus:ring-[#EA5329]/25"
          autoComplete="off"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#1d1d1f] text-white">
          <Search className="h-4 w-4" aria-hidden />
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <PillSelect
          id="brand-catalog-category"
          ariaLabel="Kategori produk"
          value={categoryId}
          onChange={(e) => {
            const v = e.target.value;
            pushParams((p) => {
              if (v) p.set("category", v);
              else p.delete("category");
            });
          }}
        >
          <option value="">Semua kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </PillSelect>

        <PillSelect
          id="brand-catalog-sort"
          ariaLabel="Urutkan"
          value={sort}
          onChange={(e) => {
            const v = e.target.value as BrandStoreSortKey;
            pushParams((p) => {
              if (v && v !== "latest") p.set("sort", v);
              else p.delete("sort");
            });
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </PillSelect>
      </div>
    </div>
  );
}
