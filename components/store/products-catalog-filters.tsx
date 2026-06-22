"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListFilter, Search, X } from "lucide-react";

import { FilterDropdown } from "@/components/shared/filter-dropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { CategoryStorePublicCategory } from "@/lib/data/category-store-page";
import type { ProductsCatalogBrandOption, ProductsCatalogSortKey } from "@/lib/data/products-catalog-page";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { value: ProductsCatalogSortKey; label: string }[] = [
  { value: "latest", label: "Terbaru" },
  { value: "best_selling", label: "Terlaris" },
  { value: "price-asc", label: "Harga termurah" },
  { value: "price-desc", label: "Harga termahal" },
];

const RATING_OPTIONS = [
  { value: "", label: "Semua rating" },
  { value: "4", label: "4 bintang & ke atas" },
  { value: "3", label: "3 bintang & ke atas" },
];

const filterTriggerClass = "h-11 min-h-11 w-full rounded-full bg-white sm:w-auto sm:min-w-[9.5rem]";

type ProductsCatalogFiltersProps = {
  categories: CategoryStorePublicCategory[];
  brands: ProductsCatalogBrandOption[];
};

function buildQueryString(params: URLSearchParams): string {
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function ProductsCatalogFilters({ categories, brands }: ProductsCatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [qInput, setQInput] = useState(searchParams.get("q") ?? "");
  const [minPriceInput, setMinPriceInput] = useState(searchParams.get("minPrice") ?? "");
  const [maxPriceInput, setMaxPriceInput] = useState(searchParams.get("maxPrice") ?? "");

  // Resync local input state when searchParams change externally (Reset button,
  // browser back/forward) — setState-during-render, not an effect, so it doesn't
  // trigger an extra commit. See https://react.dev/learn/you-might-not-need-an-effect
  const searchParamsKey = searchParams.toString();
  const [syncedKey, setSyncedKey] = useState(searchParamsKey);
  if (syncedKey !== searchParamsKey) {
    setSyncedKey(searchParamsKey);
    setQInput(searchParams.get("q") ?? "");
    setMinPriceInput(searchParams.get("minPrice") ?? "");
    setMaxPriceInput(searchParams.get("maxPrice") ?? "");
  }

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

  const categorySlug = searchParams.get("category") ?? "";
  const brandSlug = searchParams.get("brand") ?? "";
  const sort = (searchParams.get("sort") ?? "latest") as ProductsCatalogSortKey;
  const rating = searchParams.get("rating") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";

  const categoryOptions = [
    { value: "", label: "Semua kategori" },
    ...categories.map((c) => ({ value: c.slug, label: c.name })),
  ];
  const brandOptions = [
    { value: "", label: "Semua brand" },
    ...brands.map((b) => ({ value: b.slug, label: b.name })),
  ];

  const applyPrice = useCallback(() => {
    pushParams((p) => {
      const min = minPriceInput.trim();
      const max = maxPriceInput.trim();
      if (min) p.set("minPrice", min);
      else p.delete("minPrice");
      if (max) p.set("maxPrice", max);
      else p.delete("maxPrice");
    });
  }, [minPriceInput, maxPriceInput, pushParams]);

  const priceLabel =
    minPrice || maxPrice
      ? `${minPrice ? formatRupiah(Number(minPrice)) : "Rp 0"} – ${maxPrice ? formatRupiah(Number(maxPrice)) : "tanpa batas"}`
      : "Harga";

  type ActiveChip = { key: string; label: string; onRemove: () => void };
  const chips: ActiveChip[] = [];
  if (qInput.trim()) {
    chips.push({ key: "q", label: `"${qInput.trim()}"`, onRemove: () => pushParams((p) => p.delete("q")) });
  }
  if (categorySlug) {
    const c = categories.find((x) => x.slug === categorySlug);
    chips.push({
      key: "category",
      label: c?.name ?? categorySlug,
      onRemove: () => pushParams((p) => p.delete("category")),
    });
  }
  if (brandSlug) {
    const b = brands.find((x) => x.slug === brandSlug);
    chips.push({
      key: "brand",
      label: b?.name ?? brandSlug,
      onRemove: () => pushParams((p) => p.delete("brand")),
    });
  }
  if (minPrice || maxPrice) {
    chips.push({
      key: "price",
      label: priceLabel,
      onRemove: () =>
        pushParams((p) => {
          p.delete("minPrice");
          p.delete("maxPrice");
        }),
    });
  }
  if (rating) {
    chips.push({ key: "rating", label: `${rating} bintang & ke atas`, onRemove: () => pushParams((p) => p.delete("rating")) });
  }

  const hasFilters = chips.length > 0 || sort !== "latest";

  const clearAll = useCallback(() => {
    setQInput("");
    setMinPriceInput("");
    setMaxPriceInput("");
    router.push(pathname);
  }, [router, pathname]);

  const filterControls = (
    <>
      <FilterDropdown
        aria-label="Kategori produk"
        className={filterTriggerClass}
        value={categorySlug}
        options={categoryOptions}
        onValueChange={(v) =>
          pushParams((p) => {
            if (v) p.set("category", v);
            else p.delete("category");
          })
        }
      />
      <FilterDropdown
        aria-label="Brand produk"
        className={filterTriggerClass}
        value={brandSlug}
        options={brandOptions}
        onValueChange={(v) =>
          pushParams((p) => {
            if (v) p.set("brand", v);
            else p.delete("brand");
          })
        }
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="table-action" size="sm" className={cn(filterTriggerClass, "justify-between")}>
            <span className="truncate">{priceLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          <p className="text-xs font-medium text-muted-foreground">Rentang harga</p>
          <div className="flex items-center gap-2">
            <label htmlFor="products-price-min" className="sr-only">
              Harga minimum
            </label>
            <Input
              id="products-price-min"
              inputMode="numeric"
              placeholder="Rp min"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value.replace(/\D/g, ""))}
              className="h-9"
            />
            <span className="text-muted-foreground" aria-hidden>
              –
            </span>
            <label htmlFor="products-price-max" className="sr-only">
              Harga maksimum
            </label>
            <Input
              id="products-price-max"
              inputMode="numeric"
              placeholder="Rp maks"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value.replace(/\D/g, ""))}
              className="h-9"
            />
          </div>
          <Button type="button" variant="primary" size="sm" className="w-full" onClick={applyPrice}>
            Terapkan
          </Button>
        </PopoverContent>
      </Popover>
      <FilterDropdown
        aria-label="Rating produk"
        className={filterTriggerClass}
        value={rating}
        options={RATING_OPTIONS}
        onValueChange={(v) =>
          pushParams((p) => {
            if (v) p.set("rating", v);
            else p.delete("rating");
          })
        }
      />
      <FilterDropdown
        aria-label="Urutkan produk"
        className={filterTriggerClass}
        value={sort}
        options={SORT_OPTIONS}
        onValueChange={(v) =>
          pushParams((p) => {
            if (v && v !== "latest") p.set("sort", v);
            else p.delete("sort");
          })
        }
      />
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="products-catalog-search" className="sr-only">
            Cari produk
          </label>
          <Input
            id="products-catalog-search"
            type="search"
            value={qInput}
            onChange={(e) => scheduleSearch(e.target.value)}
            placeholder="Cari produk, brand, atau kategori..."
            className="h-11 rounded-full border-[#e0e0e0] bg-[#fafafc] pr-12 text-sm placeholder:text-muted-foreground focus-visible:border-foreground"
            autoComplete="off"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#1d1d1f] text-white">
            <Search className="h-4 w-4" aria-hidden />
          </span>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="dark" size="default" className="relative shrink-0 sm:hidden">
              <ListFilter className="h-4 w-4" />
              Filter
              {chips.length > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
                  {chips.length}
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Filter & Urutkan</SheetTitle>
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

        {/* display:contents — kontrol jadi flex item langsung dari baris di atas, biar search+filter+sort satu baris di sm+ */}
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

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <Badge key={chip.key} variant="outline" className="gap-1 border-brand/20 bg-brand/10 pl-2.5 pr-1.5 text-brand">
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Hapus filter ${chip.label}`}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-brand/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
