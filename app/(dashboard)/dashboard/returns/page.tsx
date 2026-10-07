import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants/payment-method-labels";
import { MANUAL_REFUND_DURATION } from "@/lib/payments/manual-refund";
import { getRefundProofUrl } from "@/lib/orders/refund-proof";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Retur & Refund",
};

const RETURN_STATUS_LABELS: Record<string, string> = {
  pending_shipback: "Menunggu Kirim Balik",
  shipped_back: "Paket Retur Dikirim",
  received: "Diterima Penjual",
  replacement_sent: "Penggantian Dikirim",
  completed: "Selesai",
};

const DATE_TIME = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
} as const;

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function DashboardReturnsPage({ searchParams }: Props) {
  const { tab: tabRaw } = await searchParams;
  const tab = tabRaw === "refund" ? "refund" : "retur";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/returns");

  // RLS membatasi semua query ke milik user ini; filter user_id tetap eksplisit.
  const [{ data: returns }, { data: refundOrders }] = await Promise.all([
    supabase
      .from("returns")
      .select("id, status, return_awb, return_courier, created_at, order_id, orders(order_number), complaints(reason)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select(`
        id, order_number, status, total,
        refund_bank_name, refund_account_name, refund_account_number,
        refund_proof_path, refund_reference, refunded_at,
        payments!inner(status, payment_type, gross_amount),
        order_status_history(status, created_at)
      `)
      .eq("user_id", user.id)
      .in("status", ["cancelled", "refunded"])
      .in("payments.status", ["paid", "refunded"])
      .order("updated_at", { ascending: false }),
  ]);

  // Query di atas sudah dibatasi user_id (RLS + filter), jadi signed URL bukti
  // transfer hanya dibuat untuk pesanan milik pembeli ini.
  const refunds = await Promise.all((refundOrders ?? []).map(async (o) => {
    const lastAt = (status: string) =>
      (o.order_status_history ?? [])
        .filter((h) => h.status === status)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.created_at ?? null;
    const payment = o.payments[0] ?? null;
    return {
      id: o.id,
      orderNumber: o.order_number,
      done: o.status === "refunded",
      amount: payment?.gross_amount ?? o.total,
      paymentType: payment?.payment_type ?? null,
      bankName: o.refund_bank_name,
      accountName: o.refund_account_name,
      accountNumber: o.refund_account_number,
      cancelledAt: lastAt("cancelled"),
      refundedAt: o.refunded_at ?? lastAt("refunded"),
      refundReference: o.refund_reference,
      proofUrl: o.status === "refunded" ? await getRefundProofUrl(o.refund_proof_path) : null,
    };
  }));
  // Yang masih diproses dulu, lalu pembatalan terbaru.
  refunds.sort(
    (a, b) => Number(a.done) - Number(b.done) || (b.cancelledAt ?? "").localeCompare(a.cancelledAt ?? ""),
  );

  const tabs = [
    { key: "retur", label: "Retur Barang", href: "/dashboard/returns", count: returns?.length ?? 0 },
    { key: "refund", label: "Pengembalian Dana", href: "/dashboard/returns?tab=refund", count: refunds.length },
  ] as const;

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold uppercase text-[#7a7a7a]">Transaksi</p>
      <h1 className="mt-2 text-2xl font-bold text-[#1d1d1f] sm:text-3xl">Retur & Refund</h1>

      <nav className="mt-6 flex gap-1 border-b border-[#e0e0e0]" aria-label="Jenis pengajuan">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4",
              tab === t.key
                ? "border-[#1d1d1f] text-[#1d1d1f]"
                : "border-transparent text-[#7a7a7a] hover:text-[#1d1d1f]",
            )}
          >
            {t.label}
            <span className="rounded-full bg-[#f0f0f0] px-1.5 py-0.5 text-[10px] leading-none text-[#5c5c5c]">
              {t.count}
            </span>
          </Link>
        ))}
      </nav>

      {tab === "retur" ? (
        !returns?.length ? (
          <p className="mt-10 text-sm text-[#5c5c5c]">
            Belum ada pengajuan retur. Retur diajukan lewat komplain di halaman detail pesanan.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {returns.map((r) => (
              <li key={r.id} className="overflow-hidden rounded-xl border border-[#e0e0e0] bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-[#f0f0f0] px-4 py-2.5">
                  <span className="truncate font-mono text-[12px] font-semibold text-[#1d1d1f]">
                    {r.orders?.order_number ?? "—"}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold",
                      r.status === "completed"
                        ? "bg-green-50 text-green-700 ring-1 ring-green-100"
                        : "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
                    )}
                  >
                    {RETURN_STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </div>
                <div className="space-y-1 px-4 py-3 text-sm">
                  {r.complaints?.reason && <p className="text-[#1d1d1f]">{r.complaints.reason}</p>}
                  <p className="text-xs text-[#7a7a7a]">Diajukan {formatDate(r.created_at, DATE_TIME)}</p>
                  {r.return_awb && (
                    <p className="text-xs text-[#5c5c5c]">
                      Resi retur: <span className="font-mono font-semibold">{r.return_awb}</span>
                      {r.return_courier ? ` (${r.return_courier.toUpperCase()})` : ""}
                    </p>
                  )}
                </div>
                <div className="flex justify-end border-t border-[#f0f0f0] px-4 py-2.5">
                  <Button asChild variant="dark" size="sm">
                    <Link href={`/dashboard/orders/${r.order_id}/return`}>Lihat Retur</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : refunds.length === 0 ? (
        <p className="mt-10 text-sm text-[#5c5c5c]">Belum ada pengembalian dana.</p>
      ) : (
        <>
          <p className="mt-6 rounded-lg bg-[#f5f5f7] px-4 py-3 text-xs leading-relaxed text-[#5c5c5c]">
            Dana pesanan yang dibatalkan setelah dibayar ditransfer manual ke rekening yang kamu isi,
            estimasi {MANUAL_REFUND_DURATION}. Kamu akan menerima notifikasi dan email saat dana sudah dikirim.
          </p>
          <ul className="mt-4 space-y-3">
            {refunds.map((r) => (
              <li key={r.id} className="overflow-hidden rounded-xl border border-[#e0e0e0] bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-[#f0f0f0] px-4 py-2.5">
                  <span className="truncate font-mono text-[12px] font-semibold text-[#1d1d1f]">
                    {r.orderNumber}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold",
                      r.done
                        ? "bg-green-50 text-green-700 ring-1 ring-green-100"
                        : "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
                    )}
                  >
                    {r.done ? "Dana Dikembalikan" : "Sedang Diproses"}
                  </span>
                </div>
                <dl className="grid gap-x-6 gap-y-3 px-4 py-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-[#7a7a7a]">Nominal refund</dt>
                    <dd className="font-semibold text-[#1d1d1f]">{formatRupiah(r.amount)}</dd>
                    {r.paymentType && (
                      <dd className="text-xs text-[#5c5c5c]">
                        Dibayar via {PAYMENT_METHOD_LABELS[r.paymentType] ?? r.paymentType.replace(/_/g, " ").toUpperCase()}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-xs text-[#7a7a7a]">Rekening tujuan</dt>
                    {r.bankName || r.accountNumber ? (
                      <>
                        <dd className="font-semibold text-[#1d1d1f]">
                          {r.bankName ?? "—"} · <span className="font-mono">{r.accountNumber ?? "—"}</span>
                        </dd>
                        <dd className="text-xs text-[#5c5c5c]">a.n. {r.accountName ?? "—"}</dd>
                      </>
                    ) : (
                      <dd className="text-xs text-[#5c5c5c]">Tidak ada data rekening — hubungi CS.</dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-xs text-[#7a7a7a]">Dibatalkan</dt>
                    <dd className="text-[#1d1d1f]">{r.cancelledAt ? formatDate(r.cancelledAt, DATE_TIME) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#7a7a7a]">Dana dikirim</dt>
                    <dd className="text-[#1d1d1f]">{r.refundedAt ? formatDate(r.refundedAt, DATE_TIME) : "Menunggu transfer"}</dd>
                    {r.refundReference && (
                      <dd className="text-xs text-[#5c5c5c]">
                        No. referensi <span className="font-mono">{r.refundReference}</span>
                      </dd>
                    )}
                  </div>
                </dl>
                <div className="flex justify-end gap-2 border-t border-[#f0f0f0] px-4 py-2.5">
                  {r.proofUrl && (
                    <Button asChild variant="secondary" size="sm">
                      <a href={r.proofUrl} target="_blank" rel="noopener noreferrer">
                        Lihat Bukti Transfer
                      </a>
                    </Button>
                  )}
                  <Button asChild variant="dark" size="sm">
                    <Link href={`/dashboard/orders/${r.id}`}>Lihat Pesanan</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
