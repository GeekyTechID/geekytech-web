"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, FileText } from "lucide-react";

import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: {
    label: "Baru",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  in_review: {
    label: "Ditinjau",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  resolved: {
    label: "Selesai",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  rejected: {
    label: "Ditolak",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
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
      <div className="flex flex-col items-center gap-3 border border-dashed border-border py-20 text-muted-foreground">
        <FileText size={36} strokeWidth={1} />
        <p className="text-sm font-bold uppercase tracking-widest">Belum ada komplain</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Pelanggan
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                No. Order
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground md:table-cell">
                Tipe
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground lg:table-cell">
                Alasan
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:table-cell">
                Tanggal
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Status
              </th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {complaints.map((complaint) => {
              const statusCfg = STATUS_CONFIG[complaint.status] ?? {
                label: complaint.status,
                className: "bg-gray-100 text-gray-700",
              };

              return (
                <tr
                  key={complaint.id}
                  className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
                >
                  {/* Customer */}
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">
                      {complaint.profiles?.full_name ?? "—"}
                    </span>
                  </td>

                  {/* Order number */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold">
                      {complaint.orders?.order_number ?? "—"}
                    </span>
                  </td>

                  {/* Type */}
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="text-xs capitalize text-muted-foreground">
                      {complaint.type.replace(/_/g, " ")}
                    </span>
                  </td>

                  {/* Reason */}
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                      {complaint.reason}
                    </p>
                  </td>

                  {/* Date */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeDate(complaint.created_at)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                        statusCfg.className
                      )}
                    >
                      {statusCfg.label}
                    </span>
                  </td>

                  {/* View */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/complaints/${complaint.id}`}
                      className="inline-flex p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="border border-border p-2 transition-colors hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="border border-border p-2 transition-colors hover:bg-muted disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
