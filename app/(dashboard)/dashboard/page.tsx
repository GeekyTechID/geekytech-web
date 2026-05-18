import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, ShoppingBag, Tag, Truck, CheckCircle, Info } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  fetchDashboardOverview,
  fetchPaidAndShippedOrderCounts,
  fetchProcessingOrdersCount,
  fetchRecentOrdersListPreview,
  fetchUserProfile,
  fetchActiveCouponsForStore,
  fetchSpendingByMonth,
  fetchPendingPaymentOrders,
  fetchUserNotifications,
} from "@/lib/data/dashboard-user";
import { formatDate, formatRupiah } from "@/lib/format";
import { orderStatusLabel, type OrderStatus } from "@/lib/constants/order-status-labels";
import { cn } from "@/lib/utils";
import { SpendingChart } from "@/components/dashboard/spending-chart";

export const metadata: Metadata = {
  title: "Ringkasan akun",
  description: "Ringkasan pesanan, notifikasi, dan aktivitas akun GeekyTech Anda.",
};

function statusBadgeClasses(status: OrderStatus): string {
  if (status === "cancelled" || status === "refunded") {
    return "bg-red-50 text-red-700 ring-1 ring-red-100";
  }
  if (status === "shipped" || status === "processing" || status === "paid") {
    return "bg-[#FFF0E8] text-[#b45309] ring-1 ring-[#EA5329]/25";
  }
  if (status === "pending_payment") {
    return "bg-amber-50 text-amber-900 ring-1 ring-amber-100";
  }
  return "bg-[#f5f5f7] text-[#333333] ring-1 ring-[#e0e0e0]";
}

type NotifType = string | null;

function notifIcon(type: NotifType) {
  switch (type) {
    case "order":
    case "order_status":
      return <ShoppingBag className="h-4 w-4" />;
    case "shipping":
    case "shipment":
      return <Truck className="h-4 w-4" />;
    case "promo":
    case "voucher":
    case "coupon":
      return <Tag className="h-4 w-4" />;
    case "completed":
    case "review":
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

function notifIconBg(type: NotifType): string {
  switch (type) {
    case "order":
    case "order_status":
      return "bg-blue-50 text-blue-600";
    case "shipping":
    case "shipment":
      return "bg-[#FFF0E8] text-[#EA5329]";
    case "promo":
    case "voucher":
    case "coupon":
      return "bg-green-50 text-green-600";
    case "completed":
    case "review":
      return "bg-purple-50 text-purple-600";
    default:
      return "bg-[#f5f5f7] text-[#5c5c5c]";
  }
}

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard");

  const [overview, processingCount, paidShippedCounts, recentOrders, profile, coupons, spending, pendingOrders, notifications] =
    await Promise.all([
      fetchDashboardOverview(user.id),
      fetchProcessingOrdersCount(user.id),
      fetchPaidAndShippedOrderCounts(user.id),
      fetchRecentOrdersListPreview(user.id, 5),
      fetchUserProfile(user.id),
      fetchActiveCouponsForStore(),
      fetchSpendingByMonth(user.id, 12),
      fetchPendingPaymentOrders(user.id, 5),
      fetchUserNotifications(user.id, 5),
    ]);

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] ?? user.email?.split("@")[0] ?? "kamu";

  return (
    <div className="w-full">
      <h1 className="text-[28px] font-semibold leading-[1.14] text-[#1d1d1f] sm:text-[32px]">
        Hi, {firstName}! Selamat datang kembali.
      </h1>
      <p className="mt-2 text-[17px] leading-[1.47] text-[#5c5c5c]">
        Ringkasan pesanan dan aktivitas akun Anda.
      </p>

      {/* Stats cards */}
      <div className="mt-10 flex justify-between gap-3 overflow-hidden">
        {[
          { href: "/dashboard/orders",                 bg: "bg-[#272729]", label: "Total pesanan", value: overview.orderCount,        sub: "Semua waktu" },
          { href: "/dashboard/orders",                 bg: "bg-[#2a2a2c]", label: "Diproses",      value: processingCount,            sub: "Dibayar, diproses, dikirim" },
          { href: "/dashboard/orders?status=paid",     bg: "bg-[#272729]", label: "Pembayaran",    value: paidShippedCounts.paid,     sub: "Berstatus dibayar" },
          { href: "/dashboard/orders?status=shipped",  bg: "bg-[#2a2a2c]", label: "Pengiriman",    value: paidShippedCounts.shipped,  sub: "Dalam pengiriman" },
          { href: "/dashboard/wishlist",               bg: "bg-[#252527]", label: "Wishlist",       value: overview.wishlistCount,     sub: "Produk tersimpan" },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`group relative min-w-0 flex-1 overflow-hidden rounded-2xl ${card.bg} p-4 text-white ring-1 ring-black/5 transition active:scale-[0.99] xl:p-6`}
          >
            <p className="truncate text-[10px] font-semibold uppercase text-white/80 sm:text-[11px]">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl xl:text-4xl">{card.value}</p>
            <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug text-white/70 sm:text-[11px]">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Pending payment alert — only shown when there are orders waiting */}
      {pendingOrders.length > 0 && (
        <section className="mt-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Info className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-amber-900">
                  {pendingOrders.length === 1
                    ? "1 pesanan menunggu pembayaran"
                    : `${pendingOrders.length} pesanan menunggu pembayaran`}
                </p>
                <p className="mt-0.5 text-[12px] text-amber-700">
                  Segera selesaikan pembayaran sebelum pesanan otomatis dibatalkan.
                </p>
              </div>
              <Link
                href="/dashboard/orders?status=pending_payment"
                className="shrink-0 rounded-full bg-amber-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-amber-700 active:scale-[0.97]"
              >
                Lihat semua
              </Link>
            </div>

            <ul className="mt-4 flex flex-col divide-y divide-amber-100">
              {pendingOrders.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {/* Thumbnail */}
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-amber-200 bg-white">
                    {o.previewImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.previewImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag className="h-4 w-4 text-amber-300" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[12px] font-semibold text-amber-900">{o.order_number}</p>
                    {o.previewName && (
                      <p className="truncate text-[11px] text-amber-700">{o.previewName}</p>
                    )}
                  </div>
                  {/* Total + CTA */}
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <p className="text-[12px] font-semibold tabular-nums text-amber-900">{formatRupiah(o.total)}</p>
                    <Link
                      href={`/dashboard/orders/${o.id}`}
                      className="rounded-full bg-amber-600 px-2.5 py-0.5 text-[11px] font-semibold text-white transition hover:bg-amber-700"
                    >
                      Bayar
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Spending chart */}
      <SpendingChart data12={spending} />

      {/* Notifications highlights */}
      {notifications.length > 0 && (
        <section className="mt-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-[21px] font-semibold leading-[1.19] text-[#1d1d1f]">Notifikasi</h2>
            <Link
              href="/dashboard/notifications"
              className="text-[14px] font-medium text-[#EA5329] underline-offset-2 hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border px-4 py-3",
                  n.is_read
                    ? "border-[#e0e0e0] bg-white"
                    : "border-[#EA5329]/20 bg-[#FFF8F5]",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    notifIconBg(n.type),
                  )}
                >
                  {notifIcon(n.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-[13px] font-semibold leading-snug",
                      n.is_read ? "text-[#1d1d1f]" : "text-[#1d1d1f]",
                    )}
                  >
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-[#5c5c5c]">{n.body}</p>
                  )}
                  <p className="mt-1 text-[11px] text-[#aaa]">
                    {formatDate(n.created_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {!n.is_read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#EA5329]" />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recent orders */}
      <section className="mt-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-[21px] font-semibold leading-[1.19] text-[#1d1d1f]">
            Pesanan terakhir
          </h2>
          <Link
            href="/dashboard/orders"
            className="text-[14px] font-medium text-[#EA5329] underline-offset-2 hover:underline"
          >
            Lihat semua
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="mt-6 text-[17px] leading-[1.47] text-[#5c5c5c]">Belum ada pesanan.</p>
        ) : (
          <ul className="mt-6 flex flex-col divide-y divide-[#f0f0f0] overflow-hidden rounded-2xl border border-[#e0e0e0] bg-white">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex flex-row items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
                {/* Thumbnail */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#e0e0e0] bg-[#f5f5f7] sm:h-16 sm:w-16">
                  {o.previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.previewImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-[9px] font-semibold uppercase text-[#aaa]">No img</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[12px] font-semibold text-[#1d1d1f] sm:text-[13px]">
                        {o.order_number}
                      </p>
                      {o.previewName && (
                        <p className="mt-0.5 truncate text-[12px] text-[#5c5c5c] sm:text-[13px]">
                          {o.previewName}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-[#7a7a7a]">
                        {formatDate(o.created_at, { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase",
                        statusBadgeClasses(o.status),
                      )}
                    >
                      {orderStatusLabel(o.status)}
                    </span>
                  </div>
                </div>

                {/* Total + CTA */}
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <p className="text-[13px] font-semibold tabular-nums text-[#1d1d1f] sm:text-[14px]">
                    {formatRupiah(o.total)}
                  </p>
                  <Link
                    href={`/dashboard/orders/${o.id}`}
                    className="rounded-full bg-[#1d1d1f] px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-[#3a3a3c] active:scale-[0.97] sm:text-[12px]"
                  >
                    Detail
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Active vouchers */}
      <section className="mt-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-[21px] font-semibold leading-[1.19] text-[#1d1d1f]">Voucher aktif</h2>
          <Link
            href="/dashboard/vouchers"
            className="text-[14px] font-medium text-[#EA5329] underline-offset-2 hover:underline"
          >
            Lihat semua
          </Link>
        </div>
        {coupons.length === 0 ? (
          <p className="mt-6 text-[17px] leading-[1.47] text-[#5c5c5c]">Tidak ada promo aktif saat ini.</p>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {coupons.slice(0, 4).map((c) => (
              <li key={c.id} className="flex items-center gap-4 rounded-2xl border border-[#e0e0e0] bg-white p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E8]">
                  <Tag className="h-5 w-5 text-[#EA5329]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[15px] font-black text-[#EA5329]">{c.code}</p>
                  <p className="mt-0.5 text-[13px] text-[#5c5c5c]">
                    {c.type === "percentage" ? `Diskon ${c.value}%` : `Potongan Rp${c.value.toLocaleString("id-ID")}`}
                    {c.min_purchase > 0 && ` · min. Rp${c.min_purchase.toLocaleString("id-ID")}`}
                  </p>
                  {c.valid_until && (
                    <p className="mt-0.5 text-[11px] text-[#7a7a7a]">s/d {formatDate(c.valid_until)}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
