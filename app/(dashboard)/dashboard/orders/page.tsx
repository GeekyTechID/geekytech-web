import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { fetchUserOrders, ORDERS_PER_PAGE } from "@/lib/data/dashboard-user";
import { ORDER_STATUS_FILTER_OPTIONS, orderStatusLabel, type OrderStatus } from "@/lib/constants/order-status-labels";
import { formatDate, formatRupiah } from "@/lib/format";
import { DashboardOrdersFilters } from "@/components/dashboard/dashboard-orders-filters";
import { DashboardOrdersPagination } from "@/components/dashboard/dashboard-orders-pagination";

export const metadata: Metadata = {
  title: "Pesanan saya",
};

function parseStatusFilter(raw: string | undefined): OrderStatus | "" {
  if (!raw) return "";
  const allowed = new Set(ORDER_STATUS_FILTER_OPTIONS.map((o) => o.value));
  if (!allowed.has(raw as OrderStatus | "")) return "";
  return raw as OrderStatus | "";
}

function statusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case "paid":
    case "processing":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";
    case "shipped":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
    case "delivered":
    case "completed":
      return "bg-green-50 text-green-700 ring-1 ring-green-100";
    case "cancelled":
    case "refunded":
      return "bg-red-50 text-red-600 ring-1 ring-red-100";
    default:
      return "bg-[#f5f5f7] text-[#5c5c5c] ring-1 ring-[#e0e0e0]";
  }
}

export default async function DashboardOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const { status: statusRaw, q: qRaw, page: pageRaw } = await searchParams;
  const statusFilter = parseStatusFilter(statusRaw);
  const search = qRaw?.trim() ?? "";
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/orders");

  const { orders, total } = await fetchUserOrders(user.id, statusFilter, search, page - 1);

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a7a7a]">Transaksi</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1d1d1f] sm:text-3xl">Pesanan</h1>

      <Suspense fallback={<div className="mt-6 h-10 w-full max-w-[14rem] animate-pulse rounded-lg bg-[#e8e8ed]" />}>
        <DashboardOrdersFilters />
      </Suspense>

      {orders.length === 0 ? (
        <p className="mt-10 text-sm text-[#5c5c5c]">
          {search ? `Tidak ada pesanan yang cocok dengan "${search}".` : "Belum ada pesanan untuk filter ini."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((o) => {
            const firstItem = o.items[0] ?? null;
            const extraCount = o.items.length - 1;
            const totalQty = o.items.reduce((s, i) => s + i.quantity, 0);

            return (
              <li key={o.id} className="overflow-hidden rounded-xl border border-[#e0e0e0] bg-white">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-[#f0f0f0] px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-[#7a7a7a]">
                      ID Transaksi
                    </span>
                    <span className="truncate font-mono text-[12px] font-semibold text-[#1d1d1f]">
                      {o.order_number}
                    </span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusBadgeClass(o.status)}`}>
                    {orderStatusLabel(o.status)}
                  </span>
                </div>

                {/* Body */}
                <div className="flex items-start gap-3 px-4 py-3 sm:gap-4">
                  {/* Product image */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#f5f5f7] sm:h-20 sm:w-20">
                    {firstItem?.image_url ? (
                      <Image
                        src={firstItem.image_url}
                        alt={firstItem.product_name}
                        fill
                        sizes="80px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                    {extraCount > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                        <span className="text-xs font-bold text-white">+{extraCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1d1d1f]">
                      {firstItem?.product_name ?? "—"}
                      {extraCount > 0 && (
                        <span className="ml-1 text-xs font-normal text-[#7a7a7a]">
                          +{extraCount} produk lainnya
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-[#7a7a7a]">{formatDate(o.created_at)}</p>
                    <p className="mt-1 text-xs text-[#5c5c5c]">
                      {totalQty} item · <span className="font-semibold text-[#1d1d1f]">{formatRupiah(o.total)}</span>
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-[#f0f0f0] px-4 py-2.5">
                  <Link
                    href={`/dashboard/orders/${o.id}`}
                    className="rounded-full bg-[#1d1d1f] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#3a3a3c] active:scale-[0.97]"
                  >
                    Lihat Detail
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {total > ORDERS_PER_PAGE && (
        <Suspense>
          <DashboardOrdersPagination
            total={total}
            perPage={ORDERS_PER_PAGE}
            currentPage={page}
          />
        </Suspense>
      )}
    </div>
  );
}
