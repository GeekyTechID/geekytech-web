"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  MoreHorizontal,
  Package,
  Trash2,
  Tag,
  CheckCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah } from "@/lib/format";
import {
  deleteProduct,
  toggleProductStatus,
  bulkDeleteProducts,
  bulkSetBrand,
  bulkSetStatus,
} from "../_actions";

// ─── Types ───────────────────────────────────────────────────────────────────

type ProductVariant = {
  id: string;
  stock: number;
  reserved: number;
  is_active: boolean;
};

type ProductImage = {
  url: string;
  is_primary: boolean;
};

type ProductCategory = {
  id: string;
  name: string;
} | null;

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  categories: ProductCategory;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
};

type Brand = { id: string; name: string };

interface ProductTableProps {
  products: ProductRow[];
  page: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  brands?: Brand[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTotalStock(variants: ProductVariant[]) {
  return variants
    .filter((v) => v.is_active)
    .reduce((sum, v) => sum + Math.max(0, v.stock - v.reserved), 0);
}

function getPrimaryImage(images: ProductImage[]) {
  return (
    images.find((img) => img.is_primary)?.url ?? images[0]?.url ?? null
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProductTable({
  products,
  page,
  totalPages,
  totalCount,
  perPage,
  brands = [],
}: ProductTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentParams = useSearchParams();

  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [isPending, startTransition] = useTransition();

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allPageIds = products.map((p) => p.id);
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const someSelected = allPageIds.some((id) => selectedIds.has(id));

  // Bulk action dialogs
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");

  const firstItem = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const lastItem = Math.min(page * perPage, totalCount);

  const goToPage = (p: number) => {
    const params = new URLSearchParams(currentParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => new Set([...prev, ...allPageIds]));
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleToggle = (product: ProductRow, value: boolean) => {
    startTransition(async () => {
      const result = await toggleProductStatus(product.id, value);
      if (result.error) toast.error(result.error);
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteProduct(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`"${deleteTarget.name}" dihapus.`);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget.id);
          return next;
        });
      }
      setDeleteTarget(null);
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const result = await bulkDeleteProducts(ids);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${ids.length} produk dihapus.`);
        clearSelection();
      }
      setBulkDeleteOpen(false);
    });
  };

  const handleBulkSetBrand = () => {
    const ids = Array.from(selectedIds);
    const brandId = selectedBrandId === "__none__" ? null : selectedBrandId || null;
    startTransition(async () => {
      const result = await bulkSetBrand(ids, brandId);
      if (result.error) {
        toast.error(result.error);
      } else {
        const brandName = brands.find((b) => b.id === brandId)?.name ?? "—";
        toast.success(`Merek ${ids.length} produk diubah ke "${brandName}".`);
        clearSelection();
      }
      setBrandDialogOpen(false);
      setSelectedBrandId("");
    });
  };

  const handleBulkStatus = (isActive: boolean) => {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const result = await bulkSetStatus(ids, isActive);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${ids.length} produk ${isActive ? "diaktifkan" : "dinonaktifkan"}.`);
        clearSelection();
      }
    });
  };

  if (products.length === 0) {
    return (
      <div className="border border-border border-dashed py-20 flex flex-col items-center gap-3 text-muted-foreground">
        <Package size={36} strokeWidth={1} />
        <p className="text-sm font-bold uppercase tracking-widest">Belum ada produk</p>
      </div>
    );
  }

  return (
    <>
      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border border-[#EA5329] bg-[#EA5329]/5 px-4 py-2.5">
          <span className="text-xs font-black uppercase tracking-widest text-[#EA5329]">
            {selectedIds.size} dipilih
          </span>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            size="sm"
            variant="outline"
            className="rounded-none h-7 text-[10px] font-bold uppercase tracking-widest"
            onClick={() => handleBulkStatus(true)}
            disabled={isPending}
          >
            <CheckCheck size={12} className="mr-1" />
            Aktifkan
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-none h-7 text-[10px] font-bold uppercase tracking-widest"
            onClick={() => handleBulkStatus(false)}
            disabled={isPending}
          >
            <XCircle size={12} className="mr-1" />
            Nonaktifkan
          </Button>
          {brands.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-none h-7 text-[10px] font-bold uppercase tracking-widest"
              onClick={() => setBrandDialogOpen(true)}
              disabled={isPending}
            >
              <Tag size={12} className="mr-1" />
              Ganti Merek
            </Button>
          )}
          <Button
            size="sm"
            className="rounded-none h-7 text-[10px] font-bold uppercase tracking-widest bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0 ml-auto"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={isPending}
          >
            <Trash2 size={12} className="mr-1" />
            Hapus
          </Button>
          <button
            onClick={clearSelection}
            className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Batal pilih
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 w-10">
                <Checkbox
                  checked={allSelected}
                  data-state={someSelected && !allSelected ? "indeterminate" : undefined}
                  onCheckedChange={(v) => toggleSelectAll(!!v)}
                  className="rounded-none"
                  aria-label="Pilih semua"
                />
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-16">
                Foto
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Produk
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden md:table-cell">
                Kategori
              </th>
              <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden sm:table-cell">
                Harga
              </th>
              <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden lg:table-cell">
                Stok
              </th>
              <th className="text-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const primaryImage = getPrimaryImage(product.product_images);
              const totalStock = getTotalStock(product.product_variants);
              const isSelected = selectedIds.has(product.id);

              return (
                <tr
                  key={product.id}
                  className={`border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors ${isSelected ? "bg-muted/40" : ""}`}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(v) => toggleSelect(product.id, !!v)}
                      className="rounded-none"
                      aria-label={`Pilih ${product.name}`}
                    />
                  </td>

                  {/* Thumbnail */}
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 border border-border overflow-hidden bg-muted shrink-0">
                      {primaryImage ? (
                        <Image
                          src={primaryImage}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={16} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Name + slug */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-sm leading-tight line-clamp-2">
                        {product.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        /{product.slug}
                      </p>
                      {product.is_featured && (
                        <Badge
                          variant="outline"
                          className="text-[9px] rounded-none px-1.5 py-0 mt-1 border-[#EA5329] text-[#EA5329] font-bold uppercase tracking-widest"
                        >
                          Unggulan
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {product.categories?.name ?? "—"}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    {product.sale_price != null ? (
                      <div>
                        <p className="font-bold text-[#EA5329] text-xs">
                          {formatRupiah(product.sale_price)}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-through">
                          {formatRupiah(product.base_price)}
                        </p>
                      </div>
                    ) : (
                      <p className="font-bold text-xs">{formatRupiah(product.base_price)}</p>
                    )}
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    <span
                      className={
                        totalStock <= 5
                          ? "font-bold text-red-500 text-xs"
                          : "text-xs font-medium"
                      }
                    >
                      {totalStock} pcs
                    </span>
                  </td>

                  {/* Toggle */}
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={product.is_active}
                      onCheckedChange={(v) => handleToggle(product, v)}
                      disabled={isPending}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <MoreHorizontal size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-none min-w-[140px]">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="flex items-center gap-2 rounded-none"
                          >
                            <Edit size={13} />
                            Edit Produk
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(product)}
                          className="text-destructive focus:text-destructive rounded-none"
                        >
                          <Trash2 size={13} className="mr-2" />
                          Hapus Produk
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Menampilkan {firstItem}-{lastItem} dari {totalCount} produk
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="p-2 border border-border disabled:opacity-40 hover:bg-muted transition-colors"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 h-8 border-y border-border flex items-center text-xs font-bold uppercase tracking-widest">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="p-2 border border-border disabled:opacity-40 hover:bg-muted transition-colors"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Single delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="rounded-none max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">
              Hapus Produk?
            </DialogTitle>
            <DialogDescription className="text-sm">
              Produk{" "}
              <span className="font-bold text-foreground">
                &quot;{deleteTarget?.name}&quot;
              </span>{" "}
              akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="rounded-none flex-1 font-bold uppercase tracking-widest text-xs"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              className="rounded-none flex-1 font-bold uppercase tracking-widest text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirm dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={(open) => !open && setBulkDeleteOpen(false)}>
        <DialogContent className="rounded-none max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">
              Hapus {selectedIds.size} Produk?
            </DialogTitle>
            <DialogDescription className="text-sm">
              Semua produk yang dipilih akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="rounded-none flex-1 font-bold uppercase tracking-widest text-xs"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              className="rounded-none flex-1 font-bold uppercase tracking-widest text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
              onClick={handleBulkDelete}
              disabled={isPending}
            >
              {isPending ? "Menghapus..." : `Hapus ${selectedIds.size} Produk`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk brand selector dialog */}
      <Dialog open={brandDialogOpen} onOpenChange={(open) => { if (!open) { setBrandDialogOpen(false); setSelectedBrandId(""); } }}>
        <DialogContent className="rounded-none max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">
              Ganti Merek
            </DialogTitle>
            <DialogDescription className="text-sm">
              Pilih merek baru untuk {selectedIds.size} produk yang dipilih.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
              <SelectTrigger className="rounded-none h-9 text-sm">
                <SelectValue placeholder="Pilih merek..." />
              </SelectTrigger>
              <SelectContent className="rounded-none">
                <SelectItem value="__none__" className="rounded-none text-muted-foreground">
                  — Tanpa merek
                </SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="rounded-none">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-none flex-1 font-bold uppercase tracking-widest text-xs"
                onClick={() => { setBrandDialogOpen(false); setSelectedBrandId(""); }}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                className="rounded-none flex-1 font-bold uppercase tracking-widest text-xs bg-[#EA5329] hover:bg-[#D44820] text-white border-0"
                onClick={handleBulkSetBrand}
                disabled={isPending || !selectedBrandId}
              >
                {isPending ? "Menyimpan..." : "Terapkan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
