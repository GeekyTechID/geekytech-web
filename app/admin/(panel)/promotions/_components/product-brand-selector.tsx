"use client";

import { useState } from "react";
import { Search, X, Package, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";

export type ProductOption = {
  id: string;
  name: string;
  slug: string;
  price: number;
  brand_name: string | null;
  condition: string;
  image_url: string | null;
};

export type BrandOption = {
  id: string;
  name: string;
  product_count: number;
};

interface ProductBrandSelectorProps {
  mode: "manual" | "brand";
  onModeChange: (mode: "manual" | "brand") => void;
  products: ProductOption[];
  brands: BrandOption[];
  selectedProductIds: string[];
  selectedBrandIds: string[];
  onProductsChange: (ids: string[]) => void;
  onBrandsChange: (ids: string[]) => void;
  /** When true, brand list is filtered and counted based on the products prop (already filtered externally). */
  filterBrandsByProducts?: boolean;
}

export function ProductBrandSelector({
  mode,
  onModeChange,
  products,
  brands,
  selectedProductIds,
  selectedBrandIds,
  onProductsChange,
  onBrandsChange,
  filterBrandsByProducts = false,
}: ProductBrandSelectorProps) {
  const [productSearch, setProductSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");

  const filteredProducts = products.filter((p) =>
    `${p.name} ${p.brand_name ?? ""}`.toLowerCase().includes(productSearch.toLowerCase()),
  );

  // When filterBrandsByProducts, derive counts and visibility from the (already filtered) products prop.
  const brandCountsByName: Record<string, number> = {};
  if (filterBrandsByProducts) {
    products.forEach((p) => {
      if (p.brand_name) brandCountsByName[p.brand_name] = (brandCountsByName[p.brand_name] ?? 0) + 1;
    });
  }

  const visibleBrands = filterBrandsByProducts
    ? brands.filter((b) => (brandCountsByName[b.name] ?? 0) > 0)
    : brands;

  const filteredBrands = visibleBrands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase()),
  );

  const getBrandCount = (b: BrandOption) =>
    filterBrandsByProducts ? (brandCountsByName[b.name] ?? 0) : b.product_count;

  const toggleProduct = (id: string) => {
    onProductsChange(
      selectedProductIds.includes(id) ? selectedProductIds.filter((x) => x !== id) : [...selectedProductIds, id],
    );
  };

  const toggleBrand = (id: string) => {
    onBrandsChange(
      selectedBrandIds.includes(id) ? selectedBrandIds.filter((x) => x !== id) : [...selectedBrandIds, id],
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex w-full overflow-hidden rounded-lg border border-[#e0e0e0] dark:border-border">
        <button
          type="button"
          onClick={() => onModeChange("manual")}
          className={cn(
            "flex flex-1 h-9 items-center justify-center gap-1.5 border-r border-[#e0e0e0] text-xs font-semibold uppercase tracking-widest transition-colors dark:border-border",
            mode === "manual" ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Package size={12} />
          Per Produk
        </button>
        <button
          type="button"
          onClick={() => onModeChange("brand")}
          className={cn(
            "flex flex-1 h-9 items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest transition-colors",
            mode === "brand" ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Building2 size={12} />
          Per Brand
        </button>
      </div>

      {mode === "manual" ? (
        <div className="space-y-3">
          <div className="relative w-full">
            <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Cari produk..."
              className="h-10 rounded-full border-[#e0e0e0] bg-card pl-10 pr-4 text-[17px] leading-[1.47] dark:border-border"
            />
          </div>

          <div className="max-h-48 overflow-y-auto rounded-lg border border-[#e0e0e0] dark:border-border">
            {filteredProducts.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Tidak ada produk</p>
            ) : (
              filteredProducts.map((p) => {
                const selected = selectedProductIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProduct(p.id)}
                    className={cn(
                      "flex w-full items-start gap-2 border-b border-[#e0e0e0] px-3 py-2.5 text-left transition-colors last:border-b-0 dark:border-border",
                      selected ? "bg-brand/5" : "hover:bg-muted/50",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0 rounded border transition-colors",
                        selected ? "border-brand bg-brand" : "border-[#e0e0e0] dark:border-border",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.brand_name ?? "—"} · {formatRupiah(p.price)}
                        {p.condition === "second" && (
                          <span className="ml-1 font-semibold text-amber-700 dark:text-amber-500">SECOND</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{selectedProductIds.length} produk dipilih</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative w-full">
            <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              placeholder="Cari brand..."
              className="h-10 rounded-full border-[#e0e0e0] bg-card pl-10 pr-4 text-[17px] leading-[1.47] dark:border-border"
            />
          </div>

          {selectedBrandIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedBrandIds.map((id) => {
                const b = brands.find((x) => x.id === id);
                if (!b) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand"
                  >
                    {b.name}
                    <button type="button" onClick={() => toggleBrand(id)} className="rounded p-0.5 hover:bg-brand/20">
                      <X size={10} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto rounded-lg border border-[#e0e0e0] dark:border-border">
            {filteredBrands.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Tidak ada brand</p>
            ) : (
              filteredBrands.map((b) => {
                const selected = selectedBrandIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBrand(b.id)}
                    className={cn(
                      "flex w-full items-center gap-2 border-b border-[#e0e0e0] px-3 py-2.5 text-left transition-colors last:border-b-0 dark:border-border",
                      selected ? "bg-brand/5" : "hover:bg-muted/50",
                    )}
                  >
                    <div
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 rounded border transition-colors",
                        selected ? "border-brand bg-brand" : "border-[#e0e0e0] dark:border-border",
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium">{b.name}</p>
                      <p className="text-[11px] text-muted-foreground">{getBrandCount(b)} produk</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {selectedBrandIds.length} brand dipilih · produk diambil otomatis dari brand yang dipilih
          </p>
        </div>
      )}
    </div>
  );
}
