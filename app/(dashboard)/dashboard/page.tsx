import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  fetchDashboardOverview,
  fetchProblemPaymentsForUser,
  fetchPaidAndShippedOrderCounts,
  fetchProcessingOrdersCount,
  fetchRecentOrdersListPreview,
  fetchUserProfile,
} from "@/lib/data/dashboard-user";
import { fetchStoreHeaderCategories } from "@/lib/data/store-header-server";
import { formatDate, formatRupiah } from "@/lib/format";
import { paymentStatusLabel } from "@/lib/constants/payment-status-labels";
import { orderStatusLabel, type OrderStatus } from "@/lib/constants/order-status-labels";
import { Button } from "@/components/ui/button";
import { DashboardOverviewFilters } from "@/components/dashboard/dashboard-overview-filters";
import { cn } from "@/lib/utils";

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

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard");

  const [overview, problems, processingCount, paidShippedCounts, recentOrders, profile, categories] =
    await Promise.all([
      fetchDashboardOverview(user.id),
      fetchProblemPaymentsForUser(user.id, 10),
      fetchProcessingOrdersCount(user.id),
      fetchPaidAndShippedOrderCounts(user.id),
      fetchRecentOrdersListPreview(user.id, 6),
      fetchUserProfile(user.id),
      fetchStoreHeaderCategories(),
    ]);

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] ?? user.email?.split("@")[0] ?? "kamu";

  return (
    <div className="w-full">
      <h1 className="text-[28px] font-semibold leading-[1.14] tracking-[0.01em] text-[#1d1d1f] sm:text-[32px]">
        Hi, {firstName}! Selamat datang kembali.
      </h1>
      <p className="mt-2 text-[17px] leading-[1.47] tracking-[-0.374px] text-[#5c5c5c]">
        Ringkasan pesanan dan aktivitas akun Anda.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/dashboard/orders"
          className="group relative overflow-hidden rounded-2xl bg-[#272729] p-10 text-white ring-1 ring-black/5 transition active:scale-[0.99]"
        >
          <p className="text-[14px] font-semibold uppercase text-white/80">Total pesanan</p>
          <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight">{overview.orderCount}</p>
          <p className="mt-2 text-[12px] leading-snug text-white/80">Semua waktu</p>
        </Link>

        <Link
          href="/dashboard/orders"
          className="group relative overflow-hidden rounded-2xl bg-[#2a2a2c] p-10 text-white ring-1 ring-black/5 transition active:scale-[0.99]"
        >
          <p className="text-[14px] font-semibold uppercase text-white/80">Sedang diproses</p>
          <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight">{processingCount}</p>
          <p className="mt-2 text-[12px] leading-snug text-white/80">Dibayar, diproses, atau dikirim</p>
        </Link>

        <Link
          href="/dashboard/orders?status=paid"
          className="group relative overflow-hidden rounded-2xl bg-[#272729] p-10 text-white ring-1 ring-black/5 transition active:scale-[0.99]"
        >
          <p className="text-[14px] font-semibold uppercase text-white/80">Pembayaran</p>
          <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight">{paidShippedCounts.paid}</p>
          <p className="mt-2 text-[12px] leading-snug text-white/80">Pesanan berstatus dibayar</p>
        </Link>

        <Link
          href="/dashboard/orders?status=shipped"
          className="group relative overflow-hidden rounded-2xl bg-[#2a2a2c] p-10 text-white ring-1 ring-black/5 transition active:scale-[0.99]"
        >
          <p className="text-[14px] font-semibold uppercase text-white/80">Pengiriman</p>
          <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight">{paidShippedCounts.shipped}</p>
          <p className="mt-2 text-[12px] leading-snug text-white/80">Sedang dalam pengiriman</p>
        </Link>

        <Link
          href="/dashboard/wishlist"
          className="group relative overflow-hidden rounded-2xl bg-[#252527] p-10 text-white ring-1 ring-black/5 transition active:scale-[0.99] md:col-span-2 xl:col-span-1"
        >
          <p className="text-[14px] font-semibold uppercase text-white/80">Wishlist</p>
          <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight">{overview.wishlistCount}</p>
          <p className="mt-2 text-[12px] leading-snug text-white/80">Produk tersimpan</p>
        </Link>
      </div>

      <section className="mt-10 rounded-2xl border border-[#e0e0e0] bg-[#fafafa] p-5 sm:p-6">
        <form action="/search" method="get" className="flex flex-col gap-4">
          <div className="min-w-0 flex-1">
            <label htmlFor="dash-search" className="sr-only">
              Cari produk
            </label>
            <input
              id="dash-search"
              name="q"
              type="search"
              placeholder="Cari produkmu di sini…"
              className="h-12 w-full rounded-full border border-black/[0.08] bg-white px-5 text-[17px] leading-[1.47] tracking-[-0.374px] text-[#1d1d1f] outline-none placeholder:text-[#7a7a7a] focus-visible:ring-2 focus-visible:ring-[#FF7A52]"
            />
          </div>
          <DashboardOverviewFilters categories={categories} />
        </form>
      </section>

      <section className="mt-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-[21px] font-semibold leading-[1.19] tracking-[0.01em] text-[#1d1d1f]">
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
          <ul className="mt-6 flex flex-col gap-4">
            {recentOrders.map((o) => (
              <li
                key={o.id}
                className="flex flex-col gap-4 rounded-2xl border border-[#e0e0e0] bg-white p-4 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5"
              >
                <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl border border-[#e0e0e0] bg-[#f5f5f7] sm:h-28 sm:w-28">
                  {o.previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL snapshot bisa eksternal
                    <img src={o.previewImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-widest text-[#7a7a7a]">
                      Tanpa gambar
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] text-[#5c5c5c]">
                        {formatDate(o.created_at, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <p className="mt-1 font-mono text-[14px] font-semibold text-[#1d1d1f]">{o.order_number}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
                        statusBadgeClasses(o.status),
                      )}
                    >
                      {orderStatusLabel(o.status)}
                    </span>
                  </div>

                  {o.previewName ? (
                    <p className="mt-3 text-[15px] font-semibold leading-snug text-[#1d1d1f]">{o.previewName}</p>
                  ) : null}
                  <p className="mt-1 text-[14px] text-[#5c5c5c]">
                    {o.previewQty} × {formatRupiah(o.previewUnitPrice)}
                  </p>
                  <p className="mt-3 text-[12px] font-semibold uppercase tracking-wider text-[#7a7a7a]">
                    Total transaksi
                  </p>
                  <p className="text-[17px] font-semibold tabular-nums text-[#1d1d1f]">{formatRupiah(o.total)}</p>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/dashboard/orders/${o.id}`}
                      className="text-[14px] font-medium text-[#EA5329] underline-offset-2 hover:underline"
                    >
                      Lihat detail transaksi
                    </Link>
                    <Button
                      asChild
                      className="h-11 rounded-full border-0 bg-[#EA5329] px-6 text-[15px] font-normal text-white hover:bg-[#d44820] active:scale-95"
                    >
                      <Link href={`/dashboard/orders/${o.id}`}>Detail</Link>
                    </Button>
                    <Link
                      href={`/dashboard/orders/${o.id}`}
                      className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e0e0e0] text-[#1d1d1f] transition hover:bg-[#f5f5f7] sm:ml-0"
                      aria-label="Menu pesanan"
                    >
                      <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14 border-t border-[#e0e0e0] pt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[17px] font-semibold leading-[1.24] tracking-[-0.374px] text-[#1d1d1f]">
              Riwayat pembayaran bermasalah
            </h2>
            <p className="mt-1 text-[14px] leading-[1.43] text-[#5c5c5c]">
              Gagal, kedaluwarsa, atau dibatalkan oleh gateway.
            </p>
          </div>
          <Button asChild variant="outline" className="w-fit rounded-full border-[#e0e0e0]">
            <Link href="/dashboard/orders?status=pending_payment">Pesanan menunggu bayar</Link>
          </Button>
        </div>
        {problems.length === 0 ? (
          <p className="mt-6 text-[17px] leading-[1.47] text-[#5c5c5c]">Belum ada riwayat pembayaran bermasalah.</p>
        ) : (
          <ul className="mt-6 divide-y divide-[#e0e0e0] rounded-2xl border border-[#e0e0e0] bg-white">
            {problems.map((p) => (
              <li
                key={p.paymentId}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link
                    href={`/dashboard/orders/${p.orderId}`}
                    className="font-mono text-[14px] font-semibold text-[#1d1d1f] underline-offset-2 hover:underline"
                  >
                    {p.orderNumber}
                  </Link>
                  <p className="text-[12px] text-[#7a7a7a]">
                    {formatDate(p.created_at, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[14px] font-semibold text-[#1d1d1f]">{formatRupiah(p.gross_amount)}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600">
                    {paymentStatusLabel(p.status)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
