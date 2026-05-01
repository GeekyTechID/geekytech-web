"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, ShoppingBag } from "lucide-react";

import { formatRupiah, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending_payment: {
    label: "Menunggu Bayar",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  paid: {
    label: "Dibayar",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  processing: {
    label: "Diproses",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  shipped: {
    label: "Dikirim",
    className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  delivered: {
    label: "Terkirim",
    className: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  },
  completed: {
    label: "Selesai",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  cancelled: {
    label: "Dibatalkan",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  refunded: {
    label: "Refund",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
};

export type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  recipient_name: string;
  courier_company: string | null;
  courier_service: string | null;
};

interface OrderTableProps {
  orders: OrderRow[];
  page: number;
  totalPages: number;
}

export function OrderTable({ orders, page, totalPages }: OrderTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 border border-dashed border-border py-20 text-muted-foreground">
        <ShoppingBag size={36} strokeWidth={1} />
        <p className="text-sm font-bold uppercase tracking-widest">Belum ada pesanan</p>
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
                No. Order
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Penerima
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground md:table-cell">
                Kurir
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:table-cell">
                Tanggal
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Total
              </th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const statusCfg = STATUS_CONFIG[order.status] ?? {
                label: order.status,
                className: "bg-gray-100 text-gray-700",
              };

              return (
                <tr
                  key={order.id}
                  className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
                >
                  {/* Order number */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-xs font-bold hover:text-brand transition-colors"
                    >
                      {order.order_number}
                    </Link>
                  </td>

                  {/* Recipient */}
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">{order.recipient_name}</span>
                  </td>

                  {/* Courier */}
                  <td className="hidden px-4 py-3 md:table-cell">
                    {order.courier_company ? (
                      <span className="text-xs text-muted-foreground">
                        {order.courier_company.toUpperCase()}{" "}
                        {order.courier_service && `— ${order.courier_service}`}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeDate(order.created_at)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                        statusCfg.className
                      )}
                    >
                      {statusCfg.label}
                    </span>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-bold">{formatRupiah(order.total)}</span>
                  </td>

                  {/* View */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Lihat detail"
                    >
                      <Eye size={15} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="border border-border p-2 transition-colors hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="border border-border p-2 transition-colors hover:bg-muted disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
