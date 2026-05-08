"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Building2, ChevronLeft, ChevronRight, Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { deleteBrand, toggleBrandStatus } from "../_actions";

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

interface BrandTableProps {
  brands: BrandRow[];
  page: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
}

export function BrandTable({ brands, page, totalPages, totalCount, perPage }: BrandTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentParams = useSearchParams();

  const [deleteTarget, setDeleteTarget] = useState<BrandRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const firstItem = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const lastItem = Math.min(page * perPage, totalCount);

  const goToPage = (p: number) => {
    const params = new URLSearchParams(currentParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleToggle = (brand: BrandRow, value: boolean) => {
    startTransition(async () => {
      const result = await toggleBrandStatus(brand.id, value);
      if (result.error) toast.error(result.error);
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteBrand(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`"${deleteTarget.name}" dihapus.`);
      }
      setDeleteTarget(null);
    });
  };

  if (brands.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 border border-dashed border-border py-20 text-muted-foreground">
        <Building2 size={36} strokeWidth={1} />
        <p className="text-sm font-bold uppercase tracking-widest">Belum ada merek</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Nama
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:table-cell">
                Slug
              </th>
              <th className="hidden px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground md:table-cell">
                Urutan
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Status
              </th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr
                key={brand.id}
                className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {brand.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="h-7 w-7 object-contain border border-border bg-white"
                      />
                    ) : (
                      <div className="h-7 w-7 border border-border bg-muted flex items-center justify-center">
                        <Building2 size={12} className="text-muted-foreground" />
                      </div>
                    )}
                    <p className="font-semibold text-sm">{brand.name}</p>
                  </div>
                </td>

                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="font-mono text-[11px] text-muted-foreground">/{brand.slug}</span>
                </td>

                <td className="hidden px-4 py-3 text-center md:table-cell">
                  <span className="text-xs text-muted-foreground">{brand.sort_order}</span>
                </td>

                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={brand.is_active}
                    onCheckedChange={(v) => handleToggle(brand, v)}
                    disabled={isPending}
                  />
                </td>

                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <MoreHorizontal size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px] rounded-none">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/admin/brands/${brand.id}/edit`}
                          className="flex items-center gap-2 rounded-none"
                        >
                          <Edit size={13} />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(brand)}
                        className="rounded-none text-destructive focus:text-destructive"
                      >
                        <Trash2 size={13} className="mr-2" />
                        Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Menampilkan {firstItem}–{lastItem} dari {totalCount} merek
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

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-none">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">
              Hapus Merek?
            </DialogTitle>
            <DialogDescription>
              Merek{" "}
              <span className="font-bold text-foreground">
                &quot;{deleteTarget?.name}&quot;
              </span>{" "}
              akan dihapus permanen. Pastikan tidak ada produk yang menggunakan merek ini.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-none font-bold uppercase tracking-widest text-xs"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              className="flex-1 rounded-none border-0 bg-destructive font-bold uppercase tracking-widest text-xs text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
