"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Eye, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
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
    return { label: "Nonaktif", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" };
  }
  if (now < starts) {
    return { label: "Terjadwal", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
  }
  if (now >= starts && now <= ends) {
    return { label: "Berlangsung", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
  }
  return { label: "Berakhir", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" };
}

function FlashSaleActions({ sale }: { sale: FlashSaleRow }) {
  const [isPending, startTransition] = useTransition();
  const status = getStatus(sale);

  const handleToggle = () => {
    startTransition(async () => {
      const { error } = await toggleFlashSaleActive(sale.id, !sale.is_active);
      if (error) toast.error(error);
      else toast.success(sale.is_active ? "Flash sale dinonaktifkan." : "Flash sale diaktifkan.");
    });
  };

  const handleDelete = () => {
    if (!confirm("Hapus flash sale ini beserta semua produknya? Tindakan tidak bisa dibatalkan.")) return;
    startTransition(async () => {
      const { error } = await deleteFlashSale(sale.id);
      if (error) toast.error(error);
      else toast.success("Flash sale dihapus.");
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/admin/promotions/flash-sale/${sale.id}`}
        className="inline-flex p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Lihat detail"
      >
        <Eye size={14} />
      </Link>
      <button
        onClick={handleDelete}
        disabled={isPending}
        title="Hapus flash sale"
        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
      >
        <Trash2 size={14} />
      </button>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "h-6 px-2 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50",
          status.className
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
      <div className="flex flex-col items-center gap-3 border border-dashed border-border py-20 text-muted-foreground">
        <Zap size={36} strokeWidth={1} />
        <p className="text-sm font-bold uppercase tracking-widest">Belum ada flash sale</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Nama
            </th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:table-cell">
              Mulai
            </th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:table-cell">
              Berakhir
            </th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground md:table-cell">
              Produk
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
          {flashSales.map((sale) => {
            const status = getStatus(sale);
            return (
              <tr
                key={sale.id}
                className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
              >
                {/* Name */}
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/promotions/flash-sale/${sale.id}`}
                    className="font-bold hover:text-brand transition-colors"
                  >
                    {sale.name}
                  </Link>
                </td>

                {/* Starts */}
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="text-xs text-muted-foreground">{formatDate(sale.starts_at)}</span>
                </td>

                {/* Ends */}
                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="text-xs text-muted-foreground">{formatDate(sale.ends_at)}</span>
                </td>

                {/* Product count */}
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="text-xs font-medium">{sale.product_count} produk</span>
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                      status.className
                    )}
                  >
                    {status.label}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <FlashSaleActions sale={sale} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
