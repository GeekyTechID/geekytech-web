"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { CornerDownRight, Edit, Grid2X2, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { deleteCategory, toggleCategoryStatus } from "../_actions";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

type FlatRow = CategoryRow & { depth: 0 | 1 };

function buildFlatTree(categories: CategoryRow[]): FlatRow[] {
  const topLevel = categories.filter((c) => !c.parent_id);
  const children = categories.filter((c) => c.parent_id);
  const result: FlatRow[] = [];
  const addedIds = new Set<string>();

  for (const parent of topLevel) {
    result.push({ ...parent, depth: 0 });
    addedIds.add(parent.id);
    for (const child of children.filter((c) => c.parent_id === parent.id)) {
      result.push({ ...child, depth: 1 });
      addedIds.add(child.id);
    }
  }

  // orphan children (parent deleted or filtered out)
  for (const child of children) {
    if (!addedIds.has(child.id)) result.push({ ...child, depth: 1 });
  }

  return result;
}

interface CategoryTableProps {
  categories: CategoryRow[];
}

export function CategoryTable({ categories }: CategoryTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const rows = buildFlatTree(categories);

  const handleToggle = (cat: CategoryRow, value: boolean) => {
    startTransition(async () => {
      const result = await toggleCategoryStatus(cat.id, value);
      if (result.error) toast.error(result.error);
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteCategory(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`"${deleteTarget.name}" dihapus.`);
      }
      setDeleteTarget(null);
    });
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 border border-dashed border-border py-20 text-muted-foreground">
        <Grid2X2 size={36} strokeWidth={1} />
        <p className="text-sm font-bold uppercase tracking-widest">Belum ada kategori</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="w-12 px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Foto
              </th>
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
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
              >
                {/* Image */}
                <td className="px-4 py-3">
                  <div className="h-9 w-9 shrink-0 overflow-hidden border border-border bg-muted">
                    {row.image_url ? (
                      <Image
                        src={row.image_url}
                        alt={row.name}
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Grid2X2 size={14} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </td>

                {/* Name */}
                <td className="px-4 py-3">
                  <div className={row.depth === 1 ? "ml-4 flex items-center gap-2" : ""}>
                    {row.depth === 1 && (
                      <CornerDownRight size={12} className="shrink-0 text-muted-foreground" />
                    )}
                    <div>
                      <p
                        className={`font-semibold leading-tight ${
                          row.depth === 0 ? "text-sm" : "text-xs text-muted-foreground"
                        }`}
                      >
                        {row.name}
                      </p>
                      {row.depth === 0 && (
                        <Badge
                          variant="outline"
                          className="mt-0.5 rounded-none px-1 py-0 text-[9px] font-bold uppercase tracking-widest"
                        >
                          Induk
                        </Badge>
                      )}
                    </div>
                  </div>
                </td>

                {/* Slug */}
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="font-mono text-[11px] text-muted-foreground">/{row.slug}</span>
                </td>

                {/* Sort order */}
                <td className="hidden px-4 py-3 text-center md:table-cell">
                  <span className="text-xs text-muted-foreground">{row.sort_order}</span>
                </td>

                {/* Toggle */}
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={row.is_active}
                    onCheckedChange={(v) => handleToggle(row, v)}
                    disabled={isPending}
                  />
                </td>

                {/* Actions */}
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
                          href={`/admin/categories/${row.id}/edit`}
                          className="flex items-center gap-2 rounded-none"
                        >
                          <Edit size={13} />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget(row)}
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

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-none">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">
              Hapus Kategori?
            </DialogTitle>
            <DialogDescription>
              Kategori{" "}
              <span className="font-bold text-foreground">
                &quot;{deleteTarget?.name}&quot;
              </span>{" "}
              akan dihapus permanen. Pastikan tidak ada produk atau subkategori di dalamnya.
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
