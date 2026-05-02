import { Suspense } from "react";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { ComplaintFilters } from "./_components/complaint-filters";
import { ComplaintTable, type ComplaintRow } from "./_components/complaint-table";

export const metadata: Metadata = { title: "Komplain — Admin GeekyTech" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
}>;

export default async function AdminComplaintsPage({
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
    .from("complaints")
    .select(
      `id, type, reason, status, created_at, resolved_at,
       orders:order_id (order_number),
       profiles:user_id (full_name)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (q) {
    query = query.or(`reason.ilike.%${q}%`);
  }

  const { data: complaints, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  const openCount = await supabase
    .from("complaints")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Komplain</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {count ?? 0} komplain
            {q ? ` untuk "${q}"` : ""}
            {status ? ` · filter: ${status.replace("_", " ")}` : ""}
          </p>
        </div>
        {(openCount.count ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 px-3 py-1.5 text-xs font-bold uppercase tracking-widest">
            {openCount.count} komplain baru
          </div>
        )}
      </div>

      {/* Filters */}
      <Suspense>
        <ComplaintFilters />
      </Suspense>

      {/* Table */}
      <Suspense>
        <ComplaintTable
          complaints={(complaints ?? []) as ComplaintRow[]}
          page={page}
          totalPages={totalPages}
        />
      </Suspense>
    </div>
  );
}
