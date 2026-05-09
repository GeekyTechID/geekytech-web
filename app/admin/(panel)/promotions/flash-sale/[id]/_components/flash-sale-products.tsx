"use client";

import { useState, useTransition } from "react";
import { Package, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { formatRupiah } from "@/lib/format";
import { Input } from "@/components/ui/input";
import {
  addFlashSaleProduct,
  updateFlashSaleProduct,
  removeFlashSaleProduct,
} from "../../_actions";

export type FlashSaleProductRow = {
  id: string;
  variant_id: string;
  sale_price: number;
  quota: number;
  sold: number;
  product_variants: {
    name: string;
    sku: string;
    price: number;
    products: { name: string; slug: string } | null;
  } | null;
};

export type VariantOption = {
  id: string;
  name: string;
  sku: string;
  price: number;
  product_name: string;
};

interface FlashSaleProductsProps {
  flashSaleId: string;
  products: FlashSaleProductRow[];
  availableVariants: VariantOption[];
}

function EditRow({
  product,
  onDone,
}: {
  product: FlashSaleProductRow;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const normalPrice = product.product_variants?.price ?? 0;
  const initialDiscount =
    normalPrice > 0
      ? Math.round(((normalPrice - product.sale_price) / normalPrice) * 100)
      : 0;
  const [discountPercent, setDiscountPercent] = useState(initialDiscount);
  const [quota, setQuota] = useState(product.quota);

  const computedPrice =
    normalPrice > 0 ? Math.round(normalPrice * (1 - discountPercent / 100)) : 0;

  const handleSave = () => {
    startTransition(async () => {
      const { error } = await updateFlashSaleProduct(product.id, computedPrice, quota);
      if (error) toast.error(error);
      else { toast.success("Produk diperbarui."); onDone(); }
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Diskon:</span>
        <div className="relative">
          <Input
            type="number"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Math.min(99, Math.max(0, parseInt(e.target.value, 10) || 0)))}
            className="h-7 w-20 rounded-none text-xs pr-6"
            min={0}
            max={99}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
        </div>
        {normalPrice > 0 && (
          <span className="text-[10px] font-bold text-[#EA5329]">
            → {formatRupiah(computedPrice)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kuota:</span>
        <Input
          type="number"
          value={quota}
          onChange={(e) => setQuota(parseInt(e.target.value, 10) || 0)}
          className="h-7 w-20 rounded-none text-xs"
          min={1}
        />
      </div>
      <button
        onClick={handleSave}
        disabled={isPending}
        className="p-1.5 bg-swiss-black text-swiss-white transition-opacity disabled:opacity-50"
      >
        <Save size={13} />
      </button>
      <button
        onClick={onDone}
        disabled={isPending}
        className="p-1.5 border border-border hover:bg-muted transition-colors disabled:opacity-50"
      >
        <X size={13} />
      </button>
    </div>
  );
}

function AddProductForm({
  flashSaleId,
  availableVariants,
}: {
  flashSaleId: string;
  availableVariants: VariantOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [variantId, setVariantId] = useState("");
  const [discountPercent, setDiscountPercent] = useState(20);
  const [quota, setQuota] = useState(10);

  const selectedVariant = availableVariants.find((v) => v.id === variantId);
  const computedPrice = selectedVariant
    ? Math.round(selectedVariant.price * (1 - discountPercent / 100))
    : 0;

  const handleAdd = () => {
    if (!variantId) { toast.error("Pilih variant terlebih dahulu."); return; }
    if (discountPercent <= 0 || discountPercent >= 100) { toast.error("Diskon harus antara 1% – 99%."); return; }
    if (computedPrice <= 0) { toast.error("Harga flash sale harus lebih dari 0."); return; }
    if (quota <= 0) { toast.error("Kuota harus lebih dari 0."); return; }

    startTransition(async () => {
      const { error } = await addFlashSaleProduct({
        flash_sale_id: flashSaleId,
        variant_id: variantId,
        sale_price: computedPrice,
        quota,
      });
      if (error) { toast.error(error); return; }
      toast.success("Produk ditambahkan ke flash sale.");
      setOpen(false);
      setVariantId("");
      setDiscountPercent(20);
      setQuota(10);
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 px-4 border border-dashed border-border text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
      >
        <Plus size={14} />
        Tambah Produk
      </button>
    );
  }

  return (
    <div className="border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest">Tambah Produk Flash Sale</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Pilih Variant *
          </label>
          <select
            value={variantId}
            onChange={(e) => {
              setVariantId(e.target.value);
            }}
            className="w-full h-9 border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="">-- Pilih variant --</option>
            {availableVariants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.product_name} — {v.name} ({v.sku}) · {formatRupiah(v.price)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Diskon *
            {selectedVariant && (
              <span className="ml-1 normal-case text-muted-foreground/60">
                (Normal: {formatRupiah(selectedVariant.price)})
              </span>
            )}
          </label>
          <div className="relative">
            <Input
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Math.min(99, Math.max(0, parseInt(e.target.value, 10) || 0)))}
              className="h-9 rounded-none text-sm pr-8"
              min={1}
              max={99}
              placeholder="20"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
          {selectedVariant && (
            <p className="text-xs font-bold text-[#EA5329]">
              Harga flash sale: {formatRupiah(computedPrice)}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Kuota *
          </label>
          <Input
            type="number"
            value={quota}
            onChange={(e) => setQuota(parseInt(e.target.value, 10) || 0)}
            className="h-9 rounded-none text-sm"
            min={1}
            placeholder="10"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={isPending}
          className="h-9 px-4 bg-swiss-black text-swiss-white text-xs font-black uppercase tracking-widest transition-opacity disabled:opacity-50"
        >
          {isPending ? "Menambahkan..." : "Tambahkan"}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="h-9 px-3 border border-border text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

export function FlashSaleProducts({
  flashSaleId,
  products,
  availableVariants,
}: FlashSaleProductsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRemove = (productId: string) => {
    if (!confirm("Hapus produk dari flash sale ini?")) return;
    startTransition(async () => {
      const { error } = await removeFlashSaleProduct(productId, flashSaleId);
      if (error) toast.error(error);
      else toast.success("Produk dihapus dari flash sale.");
    });
  };

  return (
    <div className="border border-border">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-widest">
          Produk Flash Sale ({products.length})
        </h2>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Package size={28} strokeWidth={1} />
          <p className="text-xs font-bold uppercase tracking-widest">Belum ada produk</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Produk / Variant
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Harga Normal
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Harga Flash
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Diskon
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Kuota / Terjual
                </th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const normalPrice = product.product_variants?.price ?? 0;
                const discount =
                  normalPrice > 0
                    ? Math.round(((normalPrice - product.sale_price) / normalPrice) * 100)
                    : 0;

                return (
                  <tr
                    key={product.id}
                    className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">
                        {product.product_variants?.products?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.product_variants?.name} · {product.product_variants?.sku}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {formatRupiah(normalPrice)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editingId === product.id ? (
                        <EditRow
                          product={product}
                          onDone={() => setEditingId(null)}
                        />
                      ) : (
                        <span className="text-xs font-bold text-[#EA5329]">
                          {formatRupiah(product.sale_price)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {discount > 0 && (
                        <span className="inline-block px-1.5 py-0.5 bg-[#EA5329] text-white text-[10px] font-black">
                          -{discount}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <span className="font-medium">{product.sold}</span>
                        <span className="text-muted-foreground"> / {product.quota}</span>
                      </div>
                      <div className="mt-1 h-1 w-20 bg-muted overflow-hidden">
                        <div
                          className="h-full bg-[#EA5329] transition-all"
                          style={{
                            width: `${Math.min(100, (product.sold / product.quota) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editingId !== product.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingId(product.id)}
                            className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleRemove(product.id)}
                            disabled={isPending}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
                            title="Hapus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add product form */}
      <div className="border-t border-border p-4">
        <AddProductForm flashSaleId={flashSaleId} availableVariants={availableVariants} />
      </div>
    </div>
  );
}
