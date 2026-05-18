"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AdminTableDeleteButton,
  AdminTableDetailLink,
} from "@/components/admin/admin-table-row-actions";
import { toggleFlashSaleActive, deleteFlashSale } from "../_actions";

export type FlashSaleRow = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
  product_count: number;
};

interface FlashSaleTableProps {
  flashSales: FlashSaleRow[];
}

function getStatus(sale: FlashSaleRow): { label: string; className: string } {
  const now = new Date();
  const starts = new Date(sale.starts_at);
  const ends = new Date(sale.ends_at);

  if (!sale.is_active) {
    return { label: "Nonaktif", className: "bg-muted text-muted-foreground" };
  }
  if (now < starts) {
    return { label: "Terjadwal", className: "bg-brand/10 text-brand" };
  }
  if (now >= starts && now <= ends) {
    return {
      label: "Berlangsung",
      className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400",
    };
  }
  return { label: "Berakhir", className: "bg-muted text-muted-foreground" };
}

function FlashSaleActions({ sale }: { sale: FlashSaleRow }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = getStatus(sale);

  const handleToggle = () => {
    startTransition(async () => {
      const { error } = await toggleFlashSaleActive(sale.id, !sale.is_active);
      if (error) toast.error(error);
      else toast.success(sale.is_active ? "Flash sale dinonaktifkan." : "Flash sale diaktifkan.");
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const { error } = await deleteFlashSale(sale.id);
      if (error) toast.error(error);
      else toast.success("Flash sale dihapus.");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AdminTableDetailLink href={`/admin/promotions/flash-sale/${sale.id}`}>Detail</AdminTableDetailLink>

      {confirmDelete ? (
        <>
          <span className="text-[10px] font-semibold uppercase text-destructive">
            Yakin hapus?
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="h-6 rounded-md bg-destructive/10 px-2 text-[10px] font-semibold uppercase text-destructive transition-colors hover:bg-destructive hover:text-white disabled:opacity-50"
          >
            {isPending ? "..." : "Ya, Hapus"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            disabled={isPending}
            className="h-6 rounded-md border border-[#e0e0e0] px-2 text-[10px] font-semibold uppercase text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50 dark:border-border"
          >
            Batal
          </button>
        </>
      ) : (
        <AdminTableDeleteButton onClick={() => setConfirmDelete(true)} disabled={isPending}>
          Hapus
        </AdminTableDeleteButton>
      )}

      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "h-6 rounded-md px-2 text-[10px] font-semibold uppercase transition-colors disabled:opacity-50",
          status.className,
        )}
      >
        {status.label}
      </button>
    </div>
  );
}

export function FlashSaleTable({ flashSales }: FlashSaleTableProps) {
  if (flashSales.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-muted-foreground">
        <Zap size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase">Belum ada flash sale</p>
      </div>
    );
  }

  return (
    <div className="admin-utility-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e0e0e0] bg-muted/30 dark:border-border">
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                Nama
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase text-muted-foreground sm:table-cell">
                Mulai
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase text-muted-foreground sm:table-cell">
                Berakhir
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase text-muted-foreground md:table-cell">
                Produk
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
            {flashSales.map((sale) => {
              const status = getStatus(sale);
              return (
                <tr key={sale.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/promotions/flash-sale/${sale.id}`}
                      className="font-semibold text-foreground transition-colors hover:text-brand"
                    >
                      {sale.name}
                    </Link>
                  </td>

                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs text-muted-foreground">{formatDate(sale.starts_at)}</span>
                  </td>

                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs text-muted-foreground">{formatDate(sale.ends_at)}</span>
                  </td>

                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="text-xs font-medium">{sale.product_count} produk</span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                        status.className,
                      )}
                    >
                      {status.label}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <FlashSaleActions sale={sale} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
