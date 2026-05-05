import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CategoryFilters } from "./_components/category-filters";
import { CategoryTable, type CategoryRow } from "./_components/category-table";

export const metadata: Metadata = { title: "Kelola Kategori — Admin GeekyTech" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
}>;

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "all";

  const supabase = await createClient();

  let query = supabase
    .from("categories")
    .select("id, name, slug, parent_id, sort_order, is_active, created_at", {
      count: "exact",
    })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (q) query = query.ilike("name", `%${q}%`);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  const { data: categories, count } = await query;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Kategori</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {count ?? 0} kategori{q ? ` untuk "${q}"` : ""}
          </p>
        </div>
        <Button
          asChild
          className="h-9 shrink-0 rounded-none border-0 bg-[#EA5329] px-4 font-bold uppercase tracking-widest text-xs text-white hover:bg-[#D44820]"
        >
          <Link href="/admin/categories/new">
            <Plus size={13} className="mr-1.5" />
            Tambah Kategori
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Suspense>
        <CategoryFilters />
      </Suspense>

      {/* Table */}
      <Suspense>
        <CategoryTable categories={(categories ?? []) as CategoryRow[]} />
      </Suspense>
    </div>
  );
}
