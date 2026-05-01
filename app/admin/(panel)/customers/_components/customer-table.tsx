"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, Users } from "lucide-react";

import { formatRelativeDate } from "@/lib/format";

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
      <div className="flex flex-col items-center gap-3 border border-dashed border-border py-20 text-muted-foreground">
        <Users size={36} strokeWidth={1} />
        <p className="text-sm font-bold uppercase tracking-widest">Belum ada pelanggan</p>
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
              <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:table-cell">
                No. HP
              </th>
              <th className="hidden px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground md:table-cell">
                Total Order
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground lg:table-cell">
                Bergabung
              </th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const initials = customer.full_name
                ? customer.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                : "?";

              return (
                <tr
                  key={customer.id}
                  className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
                >
                  {/* Name + avatar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-foreground text-[10px] font-black text-background">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {customer.full_name ?? <span className="italic text-muted-foreground">Belum diisi</span>}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {customer.id.slice(0, 8)}…
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {customer.phone ?? "—"}
                    </span>
                  </td>

                  {/* Order count */}
                  <td className="hidden px-4 py-3 text-center md:table-cell">
                    <span className="text-sm font-bold">{customer.order_count}</span>
                  </td>

                  {/* Join date */}
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeDate(customer.created_at)}
                    </span>
                  </td>

                  {/* View */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/customers/${customer.id}`}
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
