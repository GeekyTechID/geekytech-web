"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { togglePromotionActive, deletePromotion, type PromotionType } from "../_actions";

export type PromotionTableRow = {
  id: string;
  type: PromotionType;
  title: string;
  subtitle: string | null;
  is_active: boolean;
  max_items: number;
  selection_mode: "manual" | "brand";
  created_at: string;
  product_count: number;
  brand_count: number;
};

interface PromotionTableProps {
  rows: PromotionTableRow[];
  basePath: string;
  emptyLabel: string;
}

function RowActions({ row, basePath }: { row: PromotionTableRow; basePath: string }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const { error } = await togglePromotionActive(row.id, row.type, !row.is_active);
      if (error) toast.error(error);
      else toast.success(row.is_active ? "Promosi dinonaktifkan." : "Promosi diaktifkan.");
    });
  };

  const handleDelete = () => {
    if (!confirm("Hapus promosi ini? Tindakan tidak bisa dibatalkan.")) return;
    startTransition(async () => {
      const { error } = await deletePromotion(row.id, row.type);
      if (error) toast.error(error);
      else toast.success("Promosi dihapus.");
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`${basePath}/${row.id}`}
        className="inline-flex p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Edit"
      >
        <Eye size={14} />
      </Link>
      <button
        onClick={handleDelete}
        disabled={isPending}
        title="Hapus"
        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
      >
        <Trash2 size={14} />
      </button>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "h-6 px-2 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50",
          row.is_active
            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
        )}
      >
        {row.is_active ? "Aktif" : "Nonaktif"}
      </button>
    </div>
  );
}

export function PromotionTable({ rows, basePath, emptyLabel }: PromotionTableProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 border border-dashed border-border py-20 text-muted-foreground">
        <p className="text-sm font-bold uppercase tracking-widest">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Judul
            </th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:table-cell">
              Pilihan Produk
            </th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground md:table-cell">
              Maks. Item
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
            >
              <td className="px-4 py-3">
                <Link
                  href={`${basePath}/${row.id}`}
                  className="font-bold hover:text-brand transition-colors"
                >
                  {row.title}
                </Link>
                {row.subtitle && (
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {row.subtitle}
                  </p>
                )}
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <span className="text-xs text-muted-foreground">
                  {row.selection_mode === "brand"
                    ? `${row.brand_count} brand`
                    : `${row.product_count} produk`}
                </span>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <span className="text-xs font-medium">{row.max_items}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                    row.is_active
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  )}
                >
                  {row.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </td>
              <td className="px-4 py-3">
                <RowActions row={row} basePath={basePath} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
