import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/format";
import { RevenueChart, OrdersChart } from "@/components/admin/revenue-chart";

export const metadata: Metadata = { title: "Laporan — Admin GeekyTech" };
export const dynamic = "force-dynamic";

type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded";

const STATUS_PAID: OrderStatus[] = [
  "paid",
  "processing",
  "shipped",
  "delivered",
  "completed",
];

type DailyData = { date: string; revenue: number; orders: number };
type MonthlyData = { month: string; revenue: number; orders: number };
type BestSeller = { product_name: string; qty: number; share: number };

async function fetchReportsData() {
  const supabase = await createClient();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

  const [
    allTimeRevenue,
    allOrders,
    completedOrders,
    dailyRevenue,
    monthlyRevenue,
    bestSellers,
  ] = await Promise.all([
    supabase.from("orders").select("total").in("status", STATUS_PAID),

    supabase.from("orders").select("id, status", { count: "exact" }),

    supabase.from("orders").select("id", { count: "exact" }).eq("status", "completed"),

    supabase
      .from("orders")
      .select("created_at, total")
      .in("status", STATUS_PAID)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at"),

    supabase
      .from("orders")
      .select("created_at, total")
      .in("status", STATUS_PAID)
      .gte("created_at", twelveMonthsAgo)
      .order("created_at"),

    supabase.from("order_items").select("product_name, quantity"),
  ]);

  const totalRevenue = (allTimeRevenue.data ?? []).reduce((sum, r) => sum + r.total, 0);
  const totalOrders = allOrders.count ?? 0;
  const totalCompleted = completedOrders.count ?? 0;
  const paidCount = (allOrders.data ?? []).filter((o) => STATUS_PAID.includes(o.status as OrderStatus)).length;

  const dailyMap: Record<string, DailyData> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = `${d.getDate()}/${d.getMonth() + 1}`;
    dailyMap[key] = { date: key, revenue: 0, orders: 0 };
  }
  for (const row of dailyRevenue.data ?? []) {
    const d = new Date(row.created_at);
    const key = `${d.getDate()}/${d.getMonth() + 1}`;
    if (dailyMap[key]) {
      dailyMap[key].revenue += row.total;
      dailyMap[key].orders += 1;
    }
  }
  const dailyChartData = Object.values(dailyMap);

  const monthlyMap: Record<string, MonthlyData> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("id-ID", { month: "short", year: "2-digit" });
    monthlyMap[key] = { month: key, revenue: 0, orders: 0 };
  }
  for (const row of monthlyRevenue.data ?? []) {
    const d = new Date(row.created_at);
    const key = d.toLocaleString("id-ID", { month: "short", year: "2-digit" });
    if (monthlyMap[key]) {
      monthlyMap[key].revenue += row.total;
      monthlyMap[key].orders += 1;
    }
  }
  const monthlyChartData = Object.values(monthlyMap).map((m) => ({
    date: m.month,
    revenue: m.revenue,
    orders: m.orders,
  }));

  const qtyMap: Record<string, number> = {};
  for (const item of bestSellers.data ?? []) {
    qtyMap[item.product_name] = (qtyMap[item.product_name] ?? 0) + item.quantity;
  }
  const totalQty = Object.values(qtyMap).reduce((sum, q) => sum + q, 0);
  const bestSellerList: BestSeller[] = Object.entries(qtyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([product_name, qty]) => ({
      product_name,
      qty,
      share: totalQty > 0 ? Math.round((qty / totalQty) * 100) : 0,
    }));

  return {
    totalRevenue,
    totalOrders,
    totalCompleted,
    paidCount,
    dailyChartData,
    monthlyChartData,
    bestSellerList,
  };
}

export default async function AdminReportsPage() {
  const {
    totalRevenue,
    totalOrders,
    totalCompleted,
    paidCount,
    dailyChartData,
    monthlyChartData,
    bestSellerList,
  } = await fetchReportsData();

  const funnelPaidPct = totalOrders > 0 ? Math.round((paidCount / totalOrders) * 100) : 0;
  const funnelCompletedPct = totalOrders > 0 ? Math.round((totalCompleted / totalOrders) * 100) : 0;

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Analitik</p>
          <h1 className="text-[34px] font-semibold uppercase tracking-[-0.02em] text-foreground">Laporan</h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">Ringkasan performa penjualan</p>
        </div>
        <Link
          href="/admin/reports/export"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          <Download size={14} strokeWidth={2} />
          Export Data
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Revenue"
          value={formatRupiah(totalRevenue, true)}
          sub={formatRupiah(totalRevenue)}
          accent
        />
        <StatCard label="Total Pesanan" value={totalOrders.toLocaleString("id-ID")} sub="semua waktu" />
        <StatCard
          label="Pesanan Selesai"
          value={totalCompleted.toLocaleString("id-ID")}
          sub={`${funnelCompletedPct}% dari total pesanan`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="admin-utility-card space-y-3 p-6 lg:col-span-2">
          <h2 className="admin-section-title">Revenue — 30 Hari Terakhir</h2>
          <RevenueChart data={dailyChartData} />
        </div>
        <div className="admin-utility-card space-y-3 p-6">
          <h2 className="admin-section-title">Orders — 30 Hari Terakhir</h2>
          <OrdersChart data={dailyChartData} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="admin-utility-card space-y-3 p-6">
          <h2 className="admin-section-title">Revenue — 12 Bulan Terakhir</h2>
          <RevenueChart data={monthlyChartData} />
        </div>
        <div className="admin-utility-card space-y-3 p-6">
          <h2 className="admin-section-title">Orders — 12 Bulan Terakhir</h2>
          <OrdersChart data={monthlyChartData} />
        </div>
      </div>

      <div className="admin-utility-card overflow-hidden p-0">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Produk Terlaris</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0] text-left dark:border-border">
                {["#", "Produk", "Qty Terjual", "Share"].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
              {bestSellerList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-[17px] text-muted-foreground">
                    Belum ada data penjualan
                  </td>
                </tr>
              ) : (
                bestSellerList.map((item, idx) => (
                  <tr key={item.product_name} className="transition-colors hover:bg-muted/30">
                    <td className="w-8 px-5 py-3 text-xs font-semibold text-muted-foreground">{idx + 1}</td>
                    <td className="px-5 py-3 font-medium">{item.product_name}</td>
                    <td className="px-5 py-3 font-semibold">{item.qty.toLocaleString("id-ID")}</td>
                    <td className="px-5 py-3">
                      <div className="flex max-w-32 items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden bg-muted">
                          <div className="h-full bg-brand" style={{ width: `${item.share}%` }} />
                        </div>
                        <span className="w-8 shrink-0 text-xs font-semibold text-muted-foreground">{item.share}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-utility-card space-y-4 p-6">
        <h2 className="admin-section-title">Conversion Funnel</h2>
        <div className="space-y-3">
          <FunnelBar label="Total Pesanan Masuk" count={totalOrders} pct={100} color="bg-foreground/85" />
          <FunnelBar label="Pesanan Dibayar" count={paidCount} pct={funnelPaidPct} color="bg-brand/70" />
          <FunnelBar label="Pesanan Selesai" count={totalCompleted} pct={funnelCompletedPct} color="bg-brand" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "admin-utility-card border-brand bg-brand p-6 text-white"
          : "admin-utility-card p-6"
      }
    >
      <p className={accent ? "text-xs font-semibold uppercase tracking-widest text-white/85" : "admin-section-title"}>
        {label}
      </p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight leading-none ${accent ? "text-white" : ""}`}>{value}</p>
      <p className={`mt-2 text-xs ${accent ? "text-white/75" : "text-muted-foreground"}`}>{sub}</p>
    </div>
  );
}

function FunnelBar({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{count.toLocaleString("id-ID")}</span>
          <span className="w-10 text-right text-xs font-semibold text-muted-foreground">{pct}%</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden bg-muted">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
