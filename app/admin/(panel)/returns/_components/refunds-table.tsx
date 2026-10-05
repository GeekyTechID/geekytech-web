import Link from "next/link";

import { formatDate, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export type RefundRow = {
  id: string;
  orderNumber: string;
  status: "pending" | "refunded";
  customerName: string;
  amount: number;
  paymentType: string | null;
  paidAt: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  cancelledAt: string | null;
  cancelNote: string | null;
  refundedAt: string | null;
};

const DATE_TIME = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
} as const;

export function RefundsTable({ rows }: { rows: RefundRow[] }) {
  if (rows.length === 0) {
    return <p className="text-[14px] text-muted-foreground">Belum ada pengembalian dana.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b border-[#e0e0e0] text-left text-[11px] font-semibold uppercase text-muted-foreground">
            <th className="pb-3 pr-4">No. Order</th>
            <th className="pb-3 pr-4">Pelanggan</th>
            <th className="pb-3 pr-4">Nominal</th>
            <th className="pb-3 pr-4">Rekening Tujuan</th>
            <th className="pb-3 pr-4">Dibatalkan</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f0f0]">
          {rows.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="py-3 pr-4 font-mono text-[13px]">{r.orderNumber}</td>
              <td className="py-3 pr-4">{r.customerName}</td>
              <td className="py-3 pr-4">
                <p className="font-semibold">{formatRupiah(r.amount)}</p>
                <p className="text-[12px] text-muted-foreground">
                  {r.paymentType ? r.paymentType.replace(/_/g, " ").toUpperCase() : "—"}
                  {r.paidAt && ` · dibayar ${formatDate(r.paidAt, DATE_TIME)}`}
                </p>
              </td>
              <td className="py-3 pr-4">
                {r.bankName || r.accountNumber ? (
                  <>
                    <p className="font-semibold">{r.bankName ?? "—"}</p>
                    <p className="font-mono text-[13px]">{r.accountNumber ?? "—"}</p>
                    <p className="text-[12px] text-muted-foreground">a.n. {r.accountName ?? "—"}</p>
                  </>
                ) : (
                  <span className="text-[12px] text-destructive">Rekening belum diisi</span>
                )}
              </td>
              <td className="py-3 pr-4">
                <p className="text-muted-foreground">{r.cancelledAt ? formatDate(r.cancelledAt, DATE_TIME) : "—"}</p>
                {r.cancelNote && <p className="text-[12px] text-muted-foreground">{r.cancelNote}</p>}
              </td>
              <td className="py-3 pr-4">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    r.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800",
                  )}
                >
                  {r.status === "pending" ? "Perlu Refund" : "Dikembalikan"}
                </span>
                {r.refundedAt && (
                  <p className="mt-1.5 text-[12px] text-muted-foreground">{formatDate(r.refundedAt, DATE_TIME)}</p>
                )}
              </td>
              <td className="py-3">
                <Link href={`/admin/orders/${r.id}`} className="admin-text-link text-[13px]">
                  Lihat pesanan →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
