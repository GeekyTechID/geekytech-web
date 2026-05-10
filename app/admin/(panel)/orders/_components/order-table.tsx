"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";

import { formatRupiah, formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdminTableDetailLink } from "@/components/admin/admin-table-row-actions";
import { ADMIN_ORDER_STATUS_LABEL, adminOrderStatusBadgeClass } from "@/lib/admin/order-status-ui";

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
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-muted-foreground">
        <ShoppingBag size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase tracking-widest">Belum ada pesanan</p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0] bg-muted/30 dark:border-border">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  No. Order
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Penerima
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:table-cell">
                  Kurir
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:table-cell">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
              {orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="admin-text-link font-mono text-xs font-semibold"
                    >
                      {order.order_number}
                    </Link>
                  </td>

                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">{order.recipient_name}</span>
                  </td>

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

                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeDate(order.created_at)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
                        adminOrderStatusBadgeClass(order.status),
                      )}
                    >
                      {ADMIN_ORDER_STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold">{formatRupiah(order.total)}</span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <AdminTableDetailLink href={`/admin/orders/${order.id}`} className="min-w-0">
                      Detail
                    </AdminTableDetailLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-[#e0e0e0] p-2 transition-colors hover:bg-muted disabled:opacity-40 dark:border-border"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-[#e0e0e0] p-2 transition-colors hover:bg-muted disabled:opacity-40 dark:border-border"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
