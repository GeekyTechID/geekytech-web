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
  bulkSetCondition,
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
  condition: "new" | "second";
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
  const [conditionDialogOpen, setConditionDialogOpen] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<"new" | "second">("new");

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

  const handleBulkSetCondition = () => {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      const result = await bulkSetCondition(ids, selectedCondition);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Kondisi ${ids.length} produk diubah ke "${selectedCondition === "new" ? "Baru" : "Second"}".`);
        clearSelection();
      }
      setConditionDialogOpen(false);
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
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-muted-foreground">
        <Package size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase tracking-widest">Belum ada produk</p>
      </div>
    );
  }

  return (
    <>
      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">
            {selectedIds.size} dipilih
          </span>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button
            size="sm"
            variant="outline"
            className="h-7 rounded-md border-[#e0e0e0] text-[10px] font-semibold uppercase tracking-widest dark:border-border"
            onClick={() => handleBulkStatus(true)}
            disabled={isPending}
          >
            <CheckCheck size={12} className="mr-1" />
            Aktifkan
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 rounded-md border-[#e0e0e0] text-[10px] font-semibold uppercase tracking-widest dark:border-border"
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
              className="h-7 rounded-md border-[#e0e0e0] text-[10px] font-semibold uppercase tracking-widest dark:border-border"
              onClick={() => setBrandDialogOpen(true)}
              disabled={isPending}
            >
              <Tag size={12} className="mr-1" />
              Ganti Merek
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 rounded-md border-[#e0e0e0] text-[10px] font-semibold uppercase tracking-widest dark:border-border"
            onClick={() => setConditionDialogOpen(true)}
            disabled={isPending}
          >
            Ganti Kondisi
          </Button>
          <Button
            size="sm"
            className="ml-auto h-7 rounded-md border-0 bg-destructive text-[10px] font-semibold uppercase tracking-widest text-destructive-foreground hover:bg-destructive/90"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={isPending}
          >
            <Trash2 size={12} className="mr-1" />
            Hapus
          </Button>
          <button
            type="button"
            onClick={clearSelection}
            className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Batal pilih
          </button>
        </div>
      )}

      <div className="admin-utility-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0] bg-muted/30 dark:border-border">
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={allSelected}
                    data-state={someSelected && !allSelected ? "indeterminate" : undefined}
                    onCheckedChange={(v) => toggleSelectAll(!!v)}
                    className="rounded-md"
                    aria-label="Pilih semua"
                  />
                </th>
                <th className="w-16 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Foto
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Produk
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:table-cell">
                  Kategori
                </th>
                <th className="hidden px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:table-cell">
                  Harga
                </th>
                <th className="hidden px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground lg:table-cell">
                  Stok
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Status
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
            {products.map((product) => {
              const primaryImage = getPrimaryImage(product.product_images);
              const totalStock = getTotalStock(product.product_variants);
              const isSelected = selectedIds.has(product.id);

              return (
                <tr
                  key={product.id}
                  className={`transition-colors hover:bg-muted/30 ${isSelected ? "bg-muted/40" : ""}`}
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(v) => toggleSelect(product.id, !!v)}
                      className="rounded-md"
                      aria-label={`Pilih ${product.name}`}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[#e0e0e0] bg-muted dark:border-border">
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
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge
                          variant="outline"
                          className={`rounded-md px-1.5 py-0 text-[9px] font-semibold uppercase tracking-widest ${
                            product.condition === "second"
                              ? "border-border text-muted-foreground"
                              : "border-brand/40 text-brand"
                          }`}
                        >
                          {product.condition === "second" ? "Second" : "Baru"}
                        </Badge>
                        {product.is_featured ? (
                          <Badge
                            variant="outline"
                            className="rounded-md border-brand/50 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-widest text-brand"
                          >
                            Unggulan
                          </Badge>
                        ) : null}
                      </div>
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
                        <p className="text-xs font-semibold text-brand">{formatRupiah(product.sale_price)}</p>
                        <p className="text-[11px] text-muted-foreground line-through">
                          {formatRupiah(product.base_price)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs font-semibold">{formatRupiah(product.base_price)}</p>
                    )}
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    <span
                      className={
                        totalStock <= 5 ? "text-xs font-semibold text-brand" : "text-xs font-medium text-muted-foreground"
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
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[140px] rounded-lg border-[#e0e0e0] dark:border-border">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="flex items-center gap-2 rounded-md"
                          >
                            <Edit size={13} />
                            Edit Produk
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(product)}
                          className="rounded-md text-destructive focus:text-destructive"
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Menampilkan {firstItem}-{lastItem} dari {totalCount} produk
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-[#e0e0e0] p-2 transition-colors hover:bg-muted disabled:opacity-40 dark:border-border"
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="flex h-8 items-center border-y border-[#e0e0e0] px-3 text-xs font-semibold uppercase tracking-widest dark:border-border">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-[#e0e0e0] p-2 transition-colors hover:bg-muted disabled:opacity-40 dark:border-border"
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Single delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-lg border-[#e0e0e0] dark:border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold uppercase tracking-[-0.02em]">Hapus Produk?</DialogTitle>
            <DialogDescription className="text-[17px] leading-[1.47]">
              Produk{" "}
              <span className="font-semibold text-foreground">&quot;{deleteTarget?.name}&quot;</span> akan dihapus
              secara permanen. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              className="h-10 flex-1 rounded-full border-brand/40 text-xs font-semibold uppercase tracking-widest text-brand hover:bg-brand/5"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              className="h-10 flex-1 rounded-full border-0 bg-destructive text-xs font-semibold uppercase tracking-widest text-destructive-foreground hover:bg-destructive/90"
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
        <DialogContent className="max-w-sm rounded-lg border-[#e0e0e0] dark:border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold uppercase tracking-[-0.02em]">
              Hapus {selectedIds.size} Produk?
            </DialogTitle>
            <DialogDescription className="text-[17px] leading-[1.47]">
              Semua produk yang dipilih akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              className="h-10 flex-1 rounded-full border-brand/40 text-xs font-semibold uppercase tracking-widest text-brand hover:bg-brand/5"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              className="h-10 flex-1 rounded-full border-0 bg-destructive text-xs font-semibold uppercase tracking-widest text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
              disabled={isPending}
            >
              {isPending ? "Menghapus..." : `Hapus ${selectedIds.size} Produk`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk condition selector dialog */}
      <Dialog open={conditionDialogOpen} onOpenChange={(open) => { if (!open) setConditionDialogOpen(false); }}>
        <DialogContent className="max-w-sm rounded-lg border-[#e0e0e0] dark:border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold uppercase tracking-[-0.02em]">Ganti Kondisi</DialogTitle>
            <DialogDescription className="text-[17px] leading-[1.47]">
              Pilih kondisi baru untuk {selectedIds.size} produk yang dipilih.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="flex gap-3">
              {(["new", "second"] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSelectedCondition(val)}
                  className={`h-9 flex-1 rounded-lg border text-xs font-semibold uppercase tracking-widest transition-colors ${
                    selectedCondition === val
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-[#e0e0e0] bg-transparent text-muted-foreground hover:border-foreground hover:text-foreground dark:border-border"
                  }`}
                >
                  {val === "new" ? "Baru" : "Second"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-10 flex-1 rounded-full border-brand/40 text-xs font-semibold uppercase tracking-widest text-brand hover:bg-brand/5"
                onClick={() => setConditionDialogOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                className="h-10 flex-1 rounded-full border-0 bg-brand text-xs font-semibold uppercase tracking-widest text-white hover:opacity-90"
                onClick={handleBulkSetCondition}
                disabled={isPending}
              >
                {isPending ? "Menyimpan..." : "Terapkan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk brand selector dialog */}
      <Dialog open={brandDialogOpen} onOpenChange={(open) => { if (!open) { setBrandDialogOpen(false); setSelectedBrandId(""); } }}>
        <DialogContent className="max-w-sm rounded-lg border-[#e0e0e0] dark:border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold uppercase tracking-[-0.02em]">Ganti Merek</DialogTitle>
            <DialogDescription className="text-[17px] leading-[1.47]">
              Pilih merek baru untuk {selectedIds.size} produk yang dipilih.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
              <SelectTrigger className="h-10 rounded-lg border-[#e0e0e0] text-sm dark:border-border">
                <SelectValue placeholder="Pilih merek..." />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-[#e0e0e0] dark:border-border">
                <SelectItem value="__none__" className="rounded-md text-muted-foreground">
                  — Tanpa merek
                </SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="rounded-md">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-10 flex-1 rounded-full border-brand/40 text-xs font-semibold uppercase tracking-widest text-brand hover:bg-brand/5"
                onClick={() => { setBrandDialogOpen(false); setSelectedBrandId(""); }}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                className="h-10 flex-1 rounded-full border-0 bg-brand text-xs font-semibold uppercase tracking-widest text-white hover:opacity-90"
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
