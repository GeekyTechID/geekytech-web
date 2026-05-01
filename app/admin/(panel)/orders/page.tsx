import { Suspense } from "react";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { OrderFilters } from "./_components/order-filters";
import { OrderTable, type OrderRow } from "./_components/order-table";

export const metadata: Metadata = { title: "Kelola Pesanan — Admin GeekyTech" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
}>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, total, created_at, recipient_name, courier_company, courier_service",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) query = query.or(`order_number.ilike.%${q}%,recipient_name.ilike.%${q}%`);
  if (status) query = query.eq("status", status as "pending_payment");

  const { data: orders, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Pesanan</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {count ?? 0} pesanan{q ? ` untuk "${q}"` : ""}
          {status ? ` · filter: ${status.replace("_", " ")}` : ""}
        </p>
      </div>

      {/* Filters */}
      <Suspense>
        <OrderFilters />
      </Suspense>

      {/* Table */}
      <Suspense>
        <OrderTable
          orders={(orders ?? []) as OrderRow[]}
          page={page}
          totalPages={totalPages}
        />
      </Suspense>
    </div>
  );
}
