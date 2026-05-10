"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  AdminTableDeleteButton,
  AdminTableEditLink,
} from "@/components/admin/admin-table-row-actions";
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
    <div className="flex flex-wrap items-center gap-1.5">
      <AdminTableEditLink href={`${basePath}/${row.id}`}>Edit</AdminTableEditLink>
      <AdminTableDeleteButton onClick={handleDelete} disabled={isPending}>
        Hapus
      </AdminTableDeleteButton>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "h-6 rounded-md px-2 text-[10px] font-semibold uppercase tracking-widest transition-colors disabled:opacity-50",
          row.is_active
            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400"
            : "bg-muted text-muted-foreground",
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
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-muted-foreground">
        <p className="text-sm font-semibold uppercase tracking-widest">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="admin-utility-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e0e0e0] bg-muted/30 dark:border-border">
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Judul
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:table-cell">
                Pilihan Produk
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:table-cell">
                Maks. Item
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`${basePath}/${row.id}`}
                    className="font-semibold text-foreground transition-colors hover:text-brand"
                  >
                    {row.title}
                  </Link>
                  {row.subtitle && (
                    <p className="max-w-[220px] truncate text-xs text-muted-foreground">{row.subtitle}</p>
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
                      "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
                      row.is_active
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground",
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
    </div>
  );
}
