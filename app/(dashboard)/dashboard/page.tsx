import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  fetchDashboardOverview,
  fetchProblemPaymentsForUser,
} from "@/lib/data/dashboard-user";
import { formatDate, formatRupiah } from "@/lib/format";
import { paymentStatusLabel } from "@/lib/constants/payment-status-labels";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Ringkasan akun",
  description: "Ringkasan pesanan, notifikasi, dan aktivitas akun GeekyTech Anda.",
};

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard");

  const [overview, problems] = await Promise.all([
    fetchDashboardOverview(user.id),
    fetchProblemPaymentsForUser(user.id, 10),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a7a7a]">Ringkasan</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1d1d1f] sm:text-3xl">Halo</h1>
      <p className="mt-1 text-sm text-[#5c5c5c]">{user.email}</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard/orders"
          className="rounded-xl border border-[#e0e0e0] bg-white p-5 transition hover:border-[#1d1d1f]"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#7a7a7a]">Total pesanan</p>
          <p className="mt-2 text-3xl font-black tabular-nums">{overview.orderCount}</p>
        </Link>
        <div className="rounded-xl border border-[#e0e0e0] bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#7a7a7a]">Poin reward</p>
          <p className="mt-2 text-3xl font-black tabular-nums">—</p>
          <p className="mt-2 text-xs text-[#7a7a7a]">Program poin mengikuti pengumuman resmi toko.</p>
        </div>
        <Link
          href="/dashboard/notifications"
          className="rounded-xl border border-[#e0e0e0] bg-white p-5 transition hover:border-[#1d1d1f]"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#7a7a7a]">Notifikasi belum dibaca</p>
          <p className="mt-2 text-3xl font-black tabular-nums text-[#EA5329]">{overview.unreadNotifications}</p>
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-1">
        <Link
          href="/dashboard/wishlist"
          className="rounded-xl border border-[#e0e0e0] bg-white p-5 transition hover:border-[#1d1d1f]"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#7a7a7a]">Wishlist</p>
          <p className="mt-2 text-3xl font-black tabular-nums">{overview.wishlistCount}</p>
        </Link>
      </div>

      <section className="mt-12 border-t border-[#e0e0e0] pt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1d1d1f]">Riwayat pembayaran bermasalah</h2>
            <p className="mt-1 text-sm text-[#5c5c5c]">Gagal, kedaluwarsa, atau dibatalkan oleh gateway.</p>
          </div>
          <Button asChild variant="outline" className="w-fit border-[#e0e0e0]">
            <Link href="/dashboard/orders?status=pending_payment">Pesanan menunggu bayar</Link>
          </Button>
        </div>
        {problems.length === 0 ? (
          <p className="mt-6 text-sm text-[#5c5c5c]">Belum ada riwayat pembayaran bermasalah.</p>
        ) : (
          <ul className="mt-6 divide-y divide-[#e0e0e0] rounded-xl border border-[#e0e0e0] bg-white">
            {problems.map((p) => (
              <li key={p.paymentId} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/dashboard/orders/${p.orderId}`} className="font-mono text-sm font-semibold text-[#1d1d1f] underline-offset-2 hover:underline">
                    {p.orderNumber}
                  </Link>
                  <p className="text-xs text-[#7a7a7a]">{formatDate(p.created_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#1d1d1f]">{formatRupiah(p.gross_amount)}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-600">{paymentStatusLabel(p.status)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
