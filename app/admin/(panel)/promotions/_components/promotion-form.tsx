"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createPromotion,
  updatePromotion,
  type PromotionType,
  type PromotionFormData,
} from "../_actions";
import {
  ProductBrandSelector,
  type ProductOption,
  type BrandOption,
} from "./product-brand-selector";

// ── Template-specific extra fields ──────────────────────────────────────────

function SecondProductsConfig({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Urutan Tampil
      </label>
      <select
        value={(config.sort_by as string) ?? "rating"}
        onChange={(e) => onChange({ ...config, sort_by: e.target.value })}
        className="w-full h-9 border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
      >
        <option value="rating">Rating tertinggi</option>
        <option value="price_asc">Harga termurah</option>
        <option value="price_desc">Harga termahal</option>
        <option value="newest">Terbaru</option>
      </select>
    </div>
  );
}

function FeaturedProductsConfig({
  config,
  onChange,
  categories,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  categories?: { id: string; name: string }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Urutan Tampil
        </label>
        <select
          value={(config.sort_by as string) ?? "newest"}
          onChange={(e) => onChange({ ...config, sort_by: e.target.value })}
          className="w-full h-9 border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        >
          <option value="manual">Urutan manual</option>
          <option value="newest">Terbaru</option>
          <option value="bestseller">Terlaris</option>
          <option value="rating">Rating tertinggi</option>
        </select>
      </div>
      {categories && categories.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Filter Kategori <span className="normal-case text-muted-foreground/60">(opsional)</span>
          </label>
          <select
            value={(config.category_id as string) ?? ""}
            onChange={(e) => onChange({ ...config, category_id: e.target.value || undefined })}
            className="w-full h-9 border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function TopRatedConfig({
  config,
  onChange,
  categories,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  categories?: { id: string; name: string }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Rating Minimum
        </label>
        <select
          value={(config.min_rating as number) ?? 4}
          onChange={(e) => onChange({ ...config, min_rating: Number(e.target.value) })}
          className="w-full h-9 border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        >
          <option value={5}>5 bintang</option>
          <option value={4}>4+ bintang</option>
          <option value={3}>3+ bintang</option>
        </select>
      </div>
      {categories && categories.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Filter Kategori <span className="normal-case text-muted-foreground/60">(opsional)</span>
          </label>
          <select
            value={(config.category_id as string) ?? ""}
            onChange={(e) => onChange({ ...config, category_id: e.target.value || undefined })}
            className="w-full h-9 border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ── Main Form ────────────────────────────────────────────────────────────────

export type PromotionInitialData = {
  id: string;
  title: string;
  subtitle: string | null;
  is_active: boolean;
  max_items: number;
  selection_mode: "manual" | "brand";
  config: Record<string, unknown>;
  product_ids: string[];
  brand_ids: string[];
};

interface PromotionFormProps {
  type: PromotionType;
  backPath: string;
  redirectPath: string;
  initialData?: PromotionInitialData;
  products: ProductOption[];
  brands: BrandOption[];
  categories?: { id: string; name: string }[];
}

const TYPE_LABELS: Record<PromotionType, string> = {
  second_products: "Produk Second Terbaik",
  featured_products: "Rekomendasi Produk",
  top_rated: "Produk Rating Tertinggi",
};

export function PromotionForm({
  type,
  backPath,
  redirectPath,
  initialData,
  products,
  brands,
  categories,
}: PromotionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [subtitle, setSubtitle] = useState(initialData?.subtitle ?? "");
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [maxItems, setMaxItems] = useState(initialData?.max_items ?? 8);
  const [selectionMode, setSelectionMode] = useState<"manual" | "brand">(
    initialData?.selection_mode ?? "manual"
  );
  const [config, setConfig] = useState<Record<string, unknown>>(
    initialData?.config ?? getDefaultConfig(type)
  );
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    initialData?.product_ids ?? []
  );
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>(
    initialData?.brand_ids ?? []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Judul promosi wajib diisi."); return; }
    if (selectionMode === "manual" && selectedProductIds.length === 0) {
      toast.error("Pilih minimal 1 produk."); return;
    }
    if (selectionMode === "brand" && selectedBrandIds.length === 0) {
      toast.error("Pilih minimal 1 brand."); return;
    }

    const data: PromotionFormData = {
      type,
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      is_active: isActive,
      max_items: maxItems,
      selection_mode: selectionMode,
      config,
      product_ids: selectedProductIds,
      brand_ids: selectedBrandIds,
    };

    startTransition(async () => {
      if (initialData) {
        const { error } = await updatePromotion(initialData.id, data);
        if (error) { toast.error(error); return; }
        toast.success("Promosi diperbarui.");
        router.push(redirectPath);
      } else {
        const { error, id } = await createPromotion(data);
        if (error || !id) { toast.error(error ?? "Gagal membuat promosi."); return; }
        toast.success("Promosi berhasil dibuat.");
        router.push(`${redirectPath}/${id}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-xs font-black uppercase tracking-widest">Informasi Promosi</h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Template: {TYPE_LABELS[type]}
          </p>
        </div>
        <div className="p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Judul *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Contoh: ${getPlaceholderTitle(type)}`}
              className="h-9 rounded-none text-sm"
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Subtitle <span className="normal-case text-muted-foreground/60">(opsional)</span>
            </label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Deskripsi singkat promosi ini"
              className="h-9 rounded-none text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Maks. Produk Ditampilkan
            </label>
            <Input
              type="number"
              value={maxItems}
              onChange={(e) => setMaxItems(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="h-9 rounded-none text-sm"
              min={1}
              max={50}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Status
            </label>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={cn(
                "flex h-9 w-full items-center justify-center gap-2 border border-border text-xs font-bold uppercase tracking-widest transition-colors",
                isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isActive ? "Aktif" : "Nonaktif"}
            </button>
          </div>
        </div>
      </div>

      {/* Template-specific config */}
      <div className="border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-xs font-black uppercase tracking-widest">Pengaturan Template</h2>
        </div>
        <div className="p-4">
          {type === "second_products" && (
            <SecondProductsConfig config={config} onChange={setConfig} />
          )}
          {type === "featured_products" && (
            <FeaturedProductsConfig config={config} onChange={setConfig} categories={categories} />
          )}
          {type === "top_rated" && (
            <TopRatedConfig config={config} onChange={setConfig} categories={categories} />
          )}
        </div>
      </div>

      {/* Product / Brand selection */}
      <div className="border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-xs font-black uppercase tracking-widest">Pilihan Produk</h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Pilih produk satu per satu atau berdasarkan brand
          </p>
        </div>
        <div className="p-4">
          <ProductBrandSelector
            mode={selectionMode}
            onModeChange={setSelectionMode}
            products={type === "second_products"
              ? products.filter((p) => p.condition === "second")
              : products}
            brands={brands}
            selectedProductIds={selectedProductIds}
            selectedBrandIds={selectedBrandIds}
            onProductsChange={setSelectedProductIds}
            onBrandsChange={setSelectedBrandIds}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-6 bg-swiss-black text-swiss-white text-xs font-black uppercase tracking-widest transition-opacity disabled:opacity-50"
        >
          {isPending ? "Menyimpan..." : initialData ? "Perbarui" : "Buat Promosi"}
        </button>
        <button
          type="button"
          onClick={() => router.push(backPath)}
          disabled={isPending}
          className="h-10 px-4 border border-border text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

function getDefaultConfig(type: PromotionType): Record<string, unknown> {
  if (type === "second_products") return { sort_by: "rating" };
  if (type === "featured_products") return { sort_by: "newest" };
  if (type === "top_rated") return { min_rating: 4 };
  return {};
}

function getPlaceholderTitle(type: PromotionType): string {
  if (type === "second_products") return "Produk Second Pilihan Kami";
  if (type === "featured_products") return "Rekomendasi untuk Kamu";
  if (type === "top_rated") return "Produk Terbaik Berdasarkan Review";
  return "Judul Promosi";
}
