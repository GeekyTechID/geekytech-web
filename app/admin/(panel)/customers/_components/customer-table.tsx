"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";

import { formatRelativeDate } from "@/lib/format";
import { AdminTableDetailLink } from "@/components/admin/admin-table-row-actions";

export type CustomerRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  order_count: number;
};

interface CustomerTableProps {
  customers: CustomerRow[];
  page: number;
  totalPages: number;
}

export function CustomerTable({ customers, page, totalPages }: CustomerTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  };

  if (customers.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-muted-foreground">
        <Users size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase">Belum ada pelanggan</p>
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
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                  Pelanggan
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase text-muted-foreground sm:table-cell">
                  No. HP
                </th>
                <th className="hidden px-4 py-3 text-center text-[10px] font-semibold uppercase text-muted-foreground md:table-cell">
                  Total Order
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase text-muted-foreground lg:table-cell">
                  Bergabung
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase text-muted-foreground">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
              {customers.map((customer) => {
                const initials = customer.full_name
                  ? customer.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "?";

                return (
                  <tr key={customer.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-semibold text-foreground">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {customer.full_name ?? (
                              <span className="italic text-muted-foreground">Belum diisi</span>
                            )}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">{customer.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>

                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="text-sm text-muted-foreground">{customer.phone ?? "—"}</span>
                    </td>

                    <td className="hidden px-4 py-3 text-center md:table-cell">
                      <span className="text-sm font-semibold">{customer.order_count}</span>
                    </td>

                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(customer.created_at)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <AdminTableDetailLink href={`/admin/customers/${customer.id}`}>Detail</AdminTableDetailLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between pt-2">
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
      ) : null}
    </>
  );
}
