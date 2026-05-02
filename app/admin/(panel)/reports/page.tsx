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
    supabase
      .from("orders")
      .select("total")
      .in("status", STATUS_PAID),

    supabase
      .from("orders")
      .select("id, status", { count: "exact" }),

    supabase
      .from("orders")
      .select("id", { count: "exact" })
      .eq("status", "completed"),

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

    supabase
      .from("order_items")
      .select("product_name, quantity"),
  ]);

  const totalRevenue = (allTimeRevenue.data ?? []).reduce(
    (sum, r) => sum + r.total,
    0,
  );
  const totalOrders = allOrders.count ?? 0;
  const totalCompleted = completedOrders.count ?? 0;
  const paidCount = (allOrders.data ?? []).filter((o) =>
    STATUS_PAID.includes(o.status as OrderStatus),
  ).length;

  // Build daily chart data (last 30 days)
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

  // Build monthly chart data (last 12 months)
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

  // Best sellers
  const qtyMap: Record<string, number> = {};
  for (const item of bestSellers.data ?? []) {
    qtyMap[item.product_name] =
      (qtyMap[item.product_name] ?? 0) + item.quantity;
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

  const funnelPaidPct =
    totalOrders > 0 ? Math.round((paidCount / totalOrders) * 100) : 0;
  const funnelCompletedPct =
    totalOrders > 0 ? Math.round((totalCompleted / totalOrders) * 100) : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">
            Laporan
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ringkasan performa penjualan
          </p>
        </div>
        <Link
          href="/admin/reports/export"
          className="flex items-center gap-2 h-9 px-4 bg-swiss-black text-swiss-white text-xs font-bold uppercase tracking-widest transition-swiss"
        >
          <Download size={13} />
          Export Data
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatRupiah(totalRevenue, true)}
          sub={formatRupiah(totalRevenue)}
          accent
        />
        <StatCard
          label="Total Pesanan"
          value={totalOrders.toLocaleString("id-ID")}
          sub="semua waktu"
        />
        <StatCard
          label="Pesanan Selesai"
          value={totalCompleted.toLocaleString("id-ID")}
          sub={`${funnelCompletedPct}% dari total pesanan`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-background border border-border p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest">
            Revenue — 30 Hari Terakhir
          </h2>
          <RevenueChart data={dailyChartData} />
        </div>
        <div className="bg-background border border-border p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest">
            Orders — 30 Hari Terakhir
          </h2>
          <OrdersChart data={dailyChartData} />
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background border border-border p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest">
            Revenue — 12 Bulan Terakhir
          </h2>
          <RevenueChart data={monthlyChartData} />
        </div>
        <div className="bg-background border border-border p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest">
            Orders — 12 Bulan Terakhir
          </h2>
          <OrdersChart data={monthlyChartData} />
        </div>
      </div>

      {/* Best Sellers */}
      <div className="bg-background border border-border">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-xs font-bold uppercase tracking-widest">
            Produk Terlaris
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["#", "Produk", "Qty Terjual", "Share"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bestSellerList.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm text-muted-foreground"
                  >
                    Belum ada data penjualan
                  </td>
                </tr>
              ) : (
                bestSellerList.map((item, idx) => (
                  <tr key={item.product_name} className="hover:bg-muted/50 transition-swiss">
                    <td className="px-5 py-3 text-xs font-black text-muted-foreground w-8">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-3 font-medium">{item.product_name}</td>
                    <td className="px-5 py-3 font-black">
                      {item.qty.toLocaleString("id-ID")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted overflow-hidden max-w-24">
                          <div
                            className="h-full bg-[#EA5329]"
                            style={{ width: `${item.share}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground w-8 shrink-0">
                          {item.share}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-background border border-border p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest">
          Conversion Funnel
        </h2>
        <div className="space-y-3">
          <FunnelBar
            label="Total Pesanan Masuk"
            count={totalOrders}
            pct={100}
            color="bg-swiss-black"
          />
          <FunnelBar
            label="Pesanan Dibayar"
            count={paidCount}
            pct={funnelPaidPct}
            color="bg-blue-500"
          />
          <FunnelBar
            label="Pesanan Selesai"
            count={totalCompleted}
            pct={funnelCompletedPct}
            color="bg-[#EA5329]"
          />
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
          ? "border p-5 space-y-3 bg-[#EA5329] border-[#EA5329] text-white"
          : "border p-5 space-y-3 bg-background border-border"
      }
    >
      <p
        className={
          accent
            ? "text-xs font-bold uppercase tracking-widest text-white/80"
            : "text-xs font-bold uppercase tracking-widest text-muted-foreground"
        }
      >
        {label}
      </p>
      <p className="text-3xl font-black tracking-tight leading-none">{value}</p>
      <p
        className={
          accent ? "text-xs text-white/70" : "text-xs text-muted-foreground"
        }
      >
        {sub}
      </p>
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
          <span className="text-sm font-black">
            {count.toLocaleString("id-ID")}
          </span>
          <span className="text-xs font-bold text-muted-foreground w-10 text-right">
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-2 w-full bg-muted overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
