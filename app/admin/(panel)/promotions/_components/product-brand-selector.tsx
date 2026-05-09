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
}: ProductBrandSelectorProps) {
  const [productSearch, setProductSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");

  const filteredProducts = products.filter((p) =>
    `${p.name} ${p.brand_name ?? ""}`.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const toggleProduct = (id: string) => {
    onProductsChange(
      selectedProductIds.includes(id)
        ? selectedProductIds.filter((x) => x !== id)
        : [...selectedProductIds, id]
    );
  };

  const toggleBrand = (id: string) => {
    onBrandsChange(
      selectedBrandIds.includes(id)
        ? selectedBrandIds.filter((x) => x !== id)
        : [...selectedBrandIds, id]
    );
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-0">
        <button
          type="button"
          onClick={() => onModeChange("manual")}
          className={cn(
            "flex items-center gap-1.5 h-8 px-3 border text-xs font-bold uppercase tracking-widest transition-colors",
            mode === "manual"
              ? "bg-swiss-black text-swiss-white border-swiss-black"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Package size={12} />
          Per Produk
        </button>
        <button
          type="button"
          onClick={() => onModeChange("brand")}
          className={cn(
            "flex items-center gap-1.5 h-8 px-3 border-t border-b border-r text-xs font-bold uppercase tracking-widest transition-colors",
            mode === "brand"
              ? "bg-swiss-black text-swiss-white border-swiss-black"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 size={12} />
          Per Brand
        </button>
      </div>

      {mode === "manual" ? (
        <div className="space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Cari produk..."
              className="h-8 rounded-none pl-8 text-xs"
            />
          </div>

          {selectedProductIds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedProductIds.map((id) => {
                const p = products.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-swiss-black text-swiss-white text-[10px] font-bold"
                  >
                    {p.name}
                    <button type="button" onClick={() => toggleProduct(id)}>
                      <X size={10} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="border border-border max-h-48 overflow-y-auto">
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
                      "w-full flex items-start gap-2 px-3 py-2 text-left border-b border-border last:border-b-0 transition-colors",
                      selected ? "bg-swiss-black/5" : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0 border transition-colors",
                      selected ? "border-swiss-black bg-swiss-black" : "border-border"
                    )} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.brand_name ?? "—"} · {formatRupiah(p.price)}
                        {p.condition === "second" && (
                          <span className="ml-1 text-amber-600 font-bold">SECOND</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {selectedProductIds.length} produk dipilih
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              placeholder="Cari brand..."
              className="h-8 rounded-none pl-8 text-xs"
            />
          </div>

          {selectedBrandIds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedBrandIds.map((id) => {
                const b = brands.find((x) => x.id === id);
                if (!b) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-swiss-black text-swiss-white text-[10px] font-bold"
                  >
                    {b.name}
                    <button type="button" onClick={() => toggleBrand(id)}>
                      <X size={10} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="border border-border max-h-48 overflow-y-auto">
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
                      "w-full flex items-center gap-2 px-3 py-2 text-left border-b border-border last:border-b-0 transition-colors",
                      selected ? "bg-swiss-black/5" : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "h-3.5 w-3.5 shrink-0 border transition-colors",
                      selected ? "border-swiss-black bg-swiss-black" : "border-border"
                    )} />
                    <div>
                      <p className="text-xs font-medium">{b.name}</p>
                      <p className="text-[10px] text-muted-foreground">{b.product_count} produk</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {selectedBrandIds.length} brand dipilih · produk diambil otomatis dari brand yang dipilih
          </p>
        </div>
      )}
    </div>
  );
}
