import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BrandFilters } from "./_components/brand-filters";
import { BrandTable, type BrandRow } from "./_components/brand-table";

export const metadata: Metadata = { title: "Kelola Merek — Admin GeekyTech" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  page?: string;
}>;

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;

  let query = supabase
    .from("brands")
    .select("id, name, slug, logo_url, sort_order, is_active, created_at", {
      count: "exact",
    })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (q) query = query.ilike("name", `%${q}%`);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  const { data: brands, count } = await query.range(from, to);
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Merek</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {count ?? 0} merek{q ? ` untuk "${q}"` : ""}
          </p>
        </div>
        <Button
          asChild
          className="h-11 shrink-0 rounded-none border-0 bg-[#EA5329] px-4 font-bold uppercase tracking-widest text-xs text-white hover:bg-[#D44820]"
        >
          <Link href="/admin/brands/new">
            <Plus size={13} className="mr-1.5" />
            Tambah Merek
          </Link>
        </Button>
      </div>

      <Suspense>
        <BrandFilters />
      </Suspense>

      <Suspense>
        <BrandTable
          brands={(brands ?? []) as BrandRow[]}
          page={page}
          totalPages={totalPages}
          totalCount={count ?? 0}
          perPage={PER_PAGE}
        />
      </Suspense>
    </div>
  );
}
