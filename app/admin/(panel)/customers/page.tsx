import { Suspense } from "react";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { CustomerFilters } from "./_components/customer-filters";
import { CustomerTable, type CustomerRow } from "./_components/customer-table";

export const metadata: Metadata = { title: "Kelola Pelanggan — Admin GeekyTech" };
export const dynamic = "force-dynamic";

const PER_PAGE = 25;

type SearchParams = Promise<{
  q?: string;
  page?: string;
}>;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, phone, role, created_at", { count: "exact" })
    .neq("role", "admin")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data: profiles, count } = await query;

  // Fetch order counts for displayed customers
  const userIds = profiles?.map((p) => p.id) ?? [];
  const orderCountMap: Record<string, number> = {};

  if (userIds.length > 0) {
    const { data: orders } = await supabase
      .from("orders")
      .select("user_id")
      .in("user_id", userIds);

    for (const o of orders ?? []) {
      if (o.user_id) {
        orderCountMap[o.user_id] = (orderCountMap[o.user_id] ?? 0) + 1;
      }
    }
  }

  const customers: CustomerRow[] = (profiles ?? []).map((p) => ({
    ...p,
    order_count: orderCountMap[p.id] ?? 0,
  }));

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Pelanggan</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {count ?? 0} pelanggan{q ? ` untuk "${q}"` : ""}
        </p>
      </div>

      {/* Filters */}
      <Suspense>
        <CustomerFilters />
      </Suspense>

      {/* Table */}
      <Suspense>
        <CustomerTable customers={customers} page={page} totalPages={totalPages} />
      </Suspense>
    </div>
  );
}
