import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { fetchUserOrders } from "@/lib/data/dashboard-user";
import { ORDER_STATUS_FILTER_OPTIONS, orderStatusLabel, type OrderStatus } from "@/lib/constants/order-status-labels";
import { formatDate, formatRupiah } from "@/lib/format";
import { DashboardOrdersFilters } from "@/components/dashboard/dashboard-orders-filters";

export const metadata: Metadata = {
  title: "Pesanan saya",
};

function parseStatusFilter(raw: string | undefined): OrderStatus | "" {
  if (!raw) return "";
  const allowed = new Set(ORDER_STATUS_FILTER_OPTIONS.map((o) => o.value));
  if (!allowed.has(raw as OrderStatus | "")) return "";
  return raw as OrderStatus | "";
}

export default async function DashboardOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusRaw } = await searchParams;
  const statusFilter = parseStatusFilter(statusRaw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/orders");

  const orders = await fetchUserOrders(user.id, statusFilter);

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a7a7a]">Transaksi</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1d1d1f] sm:text-3xl">Pesanan</h1>

      <Suspense fallback={<div className="mt-6 h-10 w-full max-w-[14rem] animate-pulse rounded-lg bg-[#e8e8ed]" />}>
        <DashboardOrdersFilters />
      </Suspense>

      {orders.length === 0 ? (
        <p className="mt-10 text-sm text-[#5c5c5c]">Belum ada pesanan untuk filter ini.</p>
      ) : (
        <ul className="mt-8 divide-y divide-[#e0e0e0] rounded-xl border border-[#e0e0e0] bg-white">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/dashboard/orders/${o.id}`}
                className="flex flex-col gap-2 px-4 py-4 transition hover:bg-[#fafafa] sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-sm font-bold text-[#1d1d1f]">{o.order_number}</p>
                  <p className="text-xs text-[#7a7a7a]">{formatDate(o.created_at)}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#EA5329]">
                    {orderStatusLabel(o.status)}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-[#1d1d1f]">{formatRupiah(o.total)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
