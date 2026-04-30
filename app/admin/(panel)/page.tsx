import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Package,
  ShoppingBag,
  Star,
  TrendingUp,
  Truck,
  Users,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatRupiah, formatDate, formatRelativeDate } from "@/lib/format";
import { RevenueChart, OrdersChart } from "@/components/admin/revenue-chart";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard Admin" };
export const revalidate = 60; // ISR: refresh data setiap 60 detik

// ----------------------------------------------------------------
// Tipe data
// ----------------------------------------------------------------
type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded";

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending_payment: { label: "Menunggu Bayar", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Clock },
  paid: { label: "Dibayar", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: CheckCircle2 },
  processing: { label: "Diproses", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", icon: Package },
  shipped: { label: "Dikirim", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400", icon: Truck },
  delivered: { label: "Terkirim", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400", icon: CheckCircle2 },
  completed: { label: "Selesai", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  cancelled: { label: "Dibatalkan", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
  refunded: { label: "Refund", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", icon: AlertTriangle },
};

// ----------------------------------------------------------------
// Data fetching
// ----------------------------------------------------------------
async function fetchDashboardData() {
  const supabase = await createClient();

  const PAID_STATUSES: OrderStatus[] = [
    "paid",
    "processing",
    "shipped",
    "delivered",
    "completed",
  ];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    revenueToday,
    revenueWeek,
    revenueMonth,
    ordersByStatus,
    newCustomersWeek,
    newCustomersMonth,
    lowStockVariants,
    recentOrders,
    recentCustomers,
    recentReviews,
    dailyRevenue,
  ] = await Promise.all([
    // Revenue hari ini
    supabase
      .from("orders")
      .select("total")
      .in("status", PAID_STATUSES)
      .gte("created_at", todayStart),

    // Revenue minggu ini
    supabase
      .from("orders")
      .select("total")
      .in("status", PAID_STATUSES)
      .gte("created_at", weekStart),

    // Revenue bulan ini
    supabase
      .from("orders")
      .select("total")
      .in("status", PAID_STATUSES)
      .gte("created_at", monthStart),

    // Order breakdown by status
    supabase
      .from("orders")
      .select("status"),

    // Pelanggan baru minggu ini
    supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .gte("created_at", weekStart)
      .eq("role", "customer"),

    // Pelanggan baru bulan ini
    supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .gte("created_at", monthStart)
      .eq("role", "customer"),

    // Low stock variants (stock <= 5)
    supabase
      .from("product_variants")
      .select("id, sku, name, stock, product_id, products!inner(name)")
      .lte("stock", 5)
      .eq("is_active", true)
      .order("stock", { ascending: true })
      .limit(8),

    // Recent orders
    supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, recipient_name, profiles!inner(full_name, id)")
      .order("created_at", { ascending: false })
      .limit(8),

    // Recent customers
    supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("role", "customer")
      .order("created_at", { ascending: false })
      .limit(6),

    // Recent reviews
    supabase
      .from("product_reviews")
      .select("id, rating, comment, created_at, is_approved, products!inner(name), profiles!inner(full_name)")
      .order("created_at", { ascending: false })
      .limit(5),

    // Daily revenue last 30 days
    supabase
      .from("orders")
      .select("created_at, total")
      .in("status", PAID_STATUSES)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at"),
  ]);

  const sumRevenue = (rows: { total: number }[] | null) =>
    (rows ?? []).reduce((sum, r) => sum + r.total, 0);

  // Aggregate daily data
  const dailyMap: Record<string, { revenue: number; orders: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = `${d.getDate()}/${d.getMonth() + 1}`;
    dailyMap[key] = { revenue: 0, orders: 0 };
  }
  for (const row of dailyRevenue.data ?? []) {
    const d = new Date(row.created_at);
    const key = `${d.getDate()}/${d.getMonth() + 1}`;
    if (dailyMap[key]) {
      dailyMap[key].revenue += row.total;
      dailyMap[key].orders += 1;
    }
  }
  const dailyChartData = Object.entries(dailyMap).map(([date, v]) => ({
    date,
    ...v,
  }));

  // Order status counts
  const statusCounts: Partial<Record<OrderStatus, number>> = {};
  for (const row of ordersByStatus.data ?? []) {
    const s = row.status as OrderStatus;
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  return {
    stats: {
      revenueToday: sumRevenue(revenueToday.data),
      revenueWeek: sumRevenue(revenueWeek.data),
      revenueMonth: sumRevenue(revenueMonth.data),
      totalOrders: (ordersByStatus.data ?? []).length,
      newCustomersWeek: newCustomersWeek.count ?? 0,
      newCustomersMonth: newCustomersMonth.count ?? 0,
    },
    statusCounts,
    lowStockVariants: lowStockVariants.data ?? [],
    recentOrders: recentOrders.data ?? [],
    recentCustomers: recentCustomers.data ?? [],
    recentReviews: recentReviews.data ?? [],
    dailyChartData,
  };
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------
export default async function AdminDashboardPage() {
  const {
    stats,
    statusCounts,
    lowStockVariants,
    recentOrders,
    recentCustomers,
    recentReviews,
    dailyChartData,
  } = await fetchDashboardData();

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl">
      {/* Header */}
      <div>
        <p className="text-swiss-eyebrow">Overview</p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Dashboard</h1>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenue Hari Ini"
          value={formatRupiah(stats.revenueToday, true)}
          sub={formatRupiah(stats.revenueToday)}
          icon={TrendingUp}
          accent
        />
        <StatCard
          label="Revenue Minggu Ini"
          value={formatRupiah(stats.revenueWeek, true)}
          sub={formatRupiah(stats.revenueWeek)}
          icon={TrendingUp}
        />
        <StatCard
          label="Revenue Bulan Ini"
          value={formatRupiah(stats.revenueMonth, true)}
          sub={formatRupiah(stats.revenueMonth)}
          icon={TrendingUp}
        />
        <StatCard
          label="Total Pesanan"
          value={stats.totalOrders.toString()}
          sub={`${stats.newCustomersMonth} pelanggan baru bulan ini`}
          icon={ShoppingBag}
        />
      </div>

      {/* ── Order Status Breakdown ──────────────────────────────── */}
      <div className="bg-background border border-border p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest mb-4">
          Status Pesanan
        </h2>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(ORDER_STATUS_CONFIG) as [OrderStatus, typeof ORDER_STATUS_CONFIG[OrderStatus]][]).map(
            ([status, cfg]) => {
              const count = statusCounts[status] ?? 0;
              const Icon = cfg.icon;
              return (
                <div
                  key={status}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold",
                    cfg.color,
                  )}
                >
                  <Icon size={12} />
                  {cfg.label}
                  <span className="font-black ml-0.5">{count}</span>
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* ── Charts + Side Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-background border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest">
              Revenue — 30 Hari Terakhir
            </h2>
          </div>
          <RevenueChart data={dailyChartData} />
        </div>

        {/* Side stats */}
        <div className="flex flex-col gap-4">
          {/* Orders chart */}
          <div className="bg-background border border-border p-5 space-y-3 flex-1">
            <h2 className="text-xs font-bold uppercase tracking-widest">
              Order — 30 Hari Terakhir
            </h2>
            <OrdersChart data={dailyChartData} />
          </div>

          {/* Pelanggan */}
          <div className="bg-background border border-border p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-muted flex items-center justify-center shrink-0">
              <Users size={18} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-black">{stats.newCustomersWeek}</p>
              <p className="text-xs text-muted-foreground">Pelanggan baru minggu ini</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Low Stock ───────────────────────────────────────────── */}
      {lowStockVariants.length > 0 && (
        <div className="bg-background border border-border">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={14} className="text-yellow-500" />
              Stok Hampir Habis
            </h2>
            <Link
              href="/admin/products?filter=low_stock"
              className="text-xs text-muted-foreground hover:text-foreground transition-swiss flex items-center gap-1"
            >
              Lihat semua <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {lowStockVariants.map((v: {
              id: string;
              sku: string;
              name: string;
              stock: number;
              product_id: string;
              products: { name: string } | { name: string }[];
            }) => {
              const productName = Array.isArray(v.products)
                ? v.products[0]?.name
                : v.products?.name;
              return (
                <div key={v.id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{productName}</p>
                    <p className="text-xs text-muted-foreground">{v.sku} · {v.name}</p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-black px-2 py-0.5 shrink-0 ml-4",
                      v.stock === 0
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                    )}
                  >
                    {v.stock === 0 ? "Habis" : `${v.stock} sisa`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recent Orders ───────────────────────────────────────── */}
      <div className="bg-background border border-border">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-xs font-bold uppercase tracking-widest">
            Pesanan Terbaru
          </h2>
          <Link
            href="/admin/orders"
            className="text-xs text-muted-foreground hover:text-foreground transition-swiss flex items-center gap-1"
          >
            Lihat semua <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["No. Order", "Pembeli", "Status", "Total", "Tanggal"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Belum ada pesanan
                  </td>
                </tr>
              ) : (
                recentOrders.map((order: {
                  id: string;
                  order_number: string;
                  status: string;
                  total: number;
                  created_at: string;
                  recipient_name: string;
                  profiles: { full_name: string | null; id: string } | { full_name: string | null; id: string }[];
                }) => {
                  const status = order.status as OrderStatus;
                  const cfg = ORDER_STATUS_CONFIG[status];
                  const Icon = cfg?.icon;
                  const buyerName = Array.isArray(order.profiles)
                    ? order.profiles[0]?.full_name
                    : order.profiles?.full_name;
                  return (
                    <tr key={order.id} className="hover:bg-muted/50 transition-swiss">
                      <td className="px-5 py-3 font-mono text-xs font-semibold">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="hover:text-[#EA5329] transition-swiss"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {buyerName ?? order.recipient_name}
                      </td>
                      <td className="px-5 py-3">
                        {cfg && (
                          <span className={cn("flex items-center gap-1 w-fit text-xs font-semibold px-2 py-0.5", cfg.color)}>
                            <Icon size={10} />
                            {cfg.label}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-semibold whitespace-nowrap">
                        {formatRupiah(order.total)}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeDate(order.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom row: Pelanggan Baru + Ulasan ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pelanggan baru */}
        <div className="bg-background border border-border">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-xs font-bold uppercase tracking-widest">
              Pelanggan Baru
            </h2>
            <Link
              href="/admin/customers"
              className="text-xs text-muted-foreground hover:text-foreground transition-swiss flex items-center gap-1"
            >
              Lihat semua <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {recentCustomers.length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-muted-foreground">
                Belum ada pelanggan
              </li>
            ) : (
              recentCustomers.map((c: { id: string; full_name: string | null; created_at: string }) => {
                const initials = c.full_name
                  ? c.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
                  : "?";
                return (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/50 transition-swiss">
                    <div className="w-7 h-7 bg-foreground text-background text-[10px] font-black flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.full_name ?? "Tanpa nama"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatRelativeDate(c.created_at)}
                    </p>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Ulasan terbaru */}
        <div className="bg-background border border-border">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-xs font-bold uppercase tracking-widest">
              Ulasan Terbaru
            </h2>
            <Link
              href="/admin/reviews"
              className="text-xs text-muted-foreground hover:text-foreground transition-swiss flex items-center gap-1"
            >
              Lihat semua <ArrowRight size={12} />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {recentReviews.length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-muted-foreground">
                Belum ada ulasan
              </li>
            ) : (
              recentReviews.map((r: {
                id: string;
                rating: number;
                comment: string | null;
                created_at: string;
                is_approved: boolean;
                products: { name: string } | { name: string }[];
                profiles: { full_name: string | null } | { full_name: string | null }[];
              }) => {
                const productName = Array.isArray(r.products)
                  ? r.products[0]?.name
                  : r.products?.name;
                const reviewerName = Array.isArray(r.profiles)
                  ? r.profiles[0]?.full_name
                  : r.profiles?.full_name;
                return (
                  <li key={r.id} className="px-5 py-3 space-y-1 hover:bg-muted/50 transition-swiss">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{productName}</p>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={10}
                            className={i < r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {r.comment ?? "—"}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{reviewerName}</p>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5",
                          r.is_approved
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                        )}
                      >
                        {r.is_approved ? "Approved" : "Pending"}
                      </span>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Helper component ────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "border p-5 space-y-3",
        accent
          ? "bg-[#EA5329] border-[#EA5329] text-white"
          : "bg-background border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <p className={cn("text-xs font-bold uppercase tracking-widest", accent ? "text-white/80" : "text-muted-foreground")}>
          {label}
        </p>
        <Icon size={16} className={accent ? "text-white/70" : "text-muted-foreground"} strokeWidth={1.5} />
      </div>
      <p className="text-3xl font-black tracking-tight leading-none">{value}</p>
      <p className={cn("text-xs truncate", accent ? "text-white/70" : "text-muted-foreground")}>{sub}</p>
    </div>
  );
}
