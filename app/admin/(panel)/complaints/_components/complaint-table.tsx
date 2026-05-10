"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, FileText } from "lucide-react";

import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: {
    label: "Baru",
    className: "bg-brand/10 text-brand",
  },
  in_review: {
    label: "Ditinjau",
    className: "bg-muted text-foreground",
  },
  resolved: {
    label: "Selesai",
    className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400",
  },
  rejected: {
    label: "Ditolak",
    className: "bg-muted text-muted-foreground",
  },
};

export type ComplaintRow = {
  id: string;
  type: string;
  reason: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  orders: { order_number: string } | null;
  profiles: { full_name: string | null } | null;
};

interface ComplaintTableProps {
  complaints: ComplaintRow[];
  page: number;
  totalPages: number;
}

export function ComplaintTable({ complaints, page, totalPages }: ComplaintTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (complaints.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-muted-foreground">
        <FileText size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase tracking-widest">Belum ada komplain</p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0] bg-muted/30 dark:border-border">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Pelanggan
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  No. Order
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:table-cell">
                  Tipe
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground lg:table-cell">
                  Alasan
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:table-cell">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Status
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
              {complaints.map((complaint) => {
                const statusCfg = STATUS_CONFIG[complaint.status] ?? {
                  label: complaint.status,
                  className: "bg-muted text-muted-foreground",
                };

                return (
                  <tr key={complaint.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="text-[17px] font-medium">{complaint.profiles?.full_name ?? "—"}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold">{complaint.orders?.order_number ?? "—"}</span>
                    </td>

                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-xs capitalize text-muted-foreground">
                        {complaint.type.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="hidden px-4 py-3 lg:table-cell">
                      <p className="max-w-xs line-clamp-1 text-xs text-muted-foreground">{complaint.reason}</p>
                    </td>

                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(complaint.created_at)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
                          statusCfg.className,
                        )}
                      >
                        {statusCfg.label}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/complaints/${complaint.id}`}
                        className="inline-flex rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Lihat detail"
                      >
                        <Eye size={15} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-[#e0e0e0] p-2 transition-colors hover:bg-muted disabled:opacity-40 dark:border-border"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-[#e0e0e0] p-2 transition-colors hover:bg-muted disabled:opacity-40 dark:border-border"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
