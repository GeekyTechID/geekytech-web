import Link from "next/link";

import { createServiceClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ReturnsTable } from "./_components/returns-table";
import { RefundsTable, type RefundRow } from "./_components/refunds-table";

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function AdminReturnsPage({ searchParams }: Props) {
  const { tab: tabRaw } = await searchParams;
  const tab = tabRaw === "refund" ? "refund" : "retur";
  const supabase = await createServiceClient();

  const [{ data: rows }, { data: refundOrders }] = await Promise.all([
    supabase
      .from("returns")
      .select(`
        id, status, return_awb, created_at,
        complaints(id, reason),
        orders(order_number),
        profiles(full_name)
      `)
      .order("created_at", { ascending: false }),
    // Pesanan batal yang sudah dibayar (perlu refund manual) + yang sudah dikembalikan.
    supabase
      .from("orders")
      .select(`
        id, order_number, status, total, recipient_name,
        refund_bank_name, refund_account_name, refund_account_number,
        profiles(full_name),
        payments!inner(status, payment_type, gross_amount, paid_at),
        order_status_history(status, note, created_at)
      `)
      .in("status", ["cancelled", "refunded"])
      .in("payments.status", ["paid", "refunded"])
      .order("updated_at", { ascending: false }),
  ]);

  const refunds: RefundRow[] = (refundOrders ?? []).map((o) => {
    const history = o.order_status_history ?? [];
    const lastAt = (status: string) =>
      history
        .filter((h) => h.status === status)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
    const payment = o.payments[0] ?? null;
    const cancelled = lastAt("cancelled");
    return {
      id: o.id,
      orderNumber: o.order_number,
      status: o.status === "refunded" ? "refunded" : "pending",
      customerName: o.profiles?.full_name ?? o.recipient_name,
      amount: payment?.gross_amount ?? o.total,
      paymentType: payment?.payment_type ?? null,
      paidAt: payment?.paid_at ?? null,
      bankName: o.refund_bank_name,
      accountName: o.refund_account_name,
      accountNumber: o.refund_account_number,
      cancelledAt: cancelled?.created_at ?? null,
      cancelNote: cancelled?.note ?? null,
      refundedAt: lastAt("refunded")?.created_at ?? null,
    };
  });
  // Antrian yang perlu ditransfer dulu, lalu pembatalan terbaru.
  refunds.sort(
    (a, b) =>
      Number(a.status === "refunded") - Number(b.status === "refunded") ||
      (b.cancelledAt ?? "").localeCompare(a.cancelledAt ?? ""),
  );
  const pendingRefunds = refunds.filter((r) => r.status === "pending").length;
  const openReturns = (rows ?? []).filter((r) => r.status !== "completed").length;

  const tabs = [
    { key: "retur", label: "Retur Barang", href: "/admin/returns", badge: openReturns },
    { key: "refund", label: "Pengembalian Dana", href: "/admin/returns?tab=refund", badge: pendingRefunds },
  ] as const;

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <p className="text-swiss-eyebrow">Layanan</p>
        <h1 className="text-[34px] font-semibold uppercase">Retur & Refund</h1>
      </div>

      <nav className="flex gap-1 border-b border-[#e0e0e0]" aria-label="Jenis pengajuan">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-[14px] font-semibold transition-colors",
              tab === t.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.badge > 0 && (
              <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] leading-none text-white">
                {t.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {tab === "retur" ? (
        <div className="admin-utility-card overflow-hidden p-0">
          <div className="admin-utility-card-header">
            <h2 className="admin-section-title">Semua Retur ({rows?.length ?? 0})</h2>
          </div>
          <div className="p-6">
            <ReturnsTable rows={rows ?? []} />
          </div>
        </div>
      ) : (
        <div className="admin-utility-card overflow-hidden p-0">
          <div className="admin-utility-card-header">
            <h2 className="admin-section-title">Pengembalian Dana ({refunds.length})</h2>
          </div>
          <div className="space-y-4 p-6">
            <p className="rounded-md bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
              Mayar tidak menyediakan refund otomatis. Transfer dana manual ke rekening pelanggan,
              lalu buka pesanan dan ubah status ke <strong>Dikembalikan</strong> — pelanggan otomatis
              menerima notifikasi dan email refund.
            </p>
            <RefundsTable rows={refunds} />
          </div>
        </div>
      )}
    </div>
  );
}
