import { Suspense } from "react";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { ReviewFilters } from "./_components/review-filters";
import { ReviewTable, type ReviewRow } from "./_components/review-table";

export const metadata: Metadata = { title: "Ulasan — Admin GeekyTech" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  rating?: string;
  page?: string;
}>;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "";
  const rating = params.rating ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("product_reviews")
    .select(
      `id, rating, comment, is_approved, deleted_at, created_at, product_id,
       products:product_id (name, slug),
       profiles:user_id (full_name)`,
      { count: "exact" }
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status === "approved") query = query.eq("is_approved", true);
  if (status === "rejected") query = query.eq("is_approved", false).not("updated_at", "is", null);
  if (status === "pending") query = query.eq("is_approved", false);
  if (rating) query = query.eq("rating", parseInt(rating, 10));

  const { data: reviews, count } = await query;

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  const pendingCount = await supabase
    .from("product_reviews")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("is_approved", false);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Ulasan</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {count ?? 0} ulasan
            {q ? ` untuk "${q}"` : ""}
            {status ? ` · filter: ${status}` : ""}
          </p>
        </div>
        {(pendingCount.count ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-3 py-1.5 text-xs font-bold uppercase tracking-widest">
            {pendingCount.count} menunggu persetujuan
          </div>
        )}
      </div>

      {/* Filters */}
      <Suspense>
        <ReviewFilters />
      </Suspense>

      {/* Table */}
      <Suspense>
        <ReviewTable
          reviews={(reviews ?? []) as ReviewRow[]}
          page={page}
          totalPages={totalPages}
        />
      </Suspense>
    </div>
  );
}
