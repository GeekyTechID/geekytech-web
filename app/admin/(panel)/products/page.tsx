import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ProductFilters } from "./_components/product-filters";
import { ProductTable, type ProductRow } from "./_components/product-table";

export const metadata: Metadata = { title: "Kelola Produk — Admin GeekyTech" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

type SearchParams = Promise<{
  q?: string;
  status?: string;
  category?: string;
  page?: string;
}>;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const categoryId = params.category ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const from = (page - 1) * PER_PAGE;
  const to = from + PER_PAGE - 1;

  const supabase = await createClient();

  const [{ data: categories }, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),

    (() => {
      let query = supabase
        .from("products")
        .select(
          `id, name, slug, base_price, sale_price, is_active, is_featured, created_at,
           categories(id, name),
           product_images(url, is_primary),
           product_variants(id, stock, reserved, is_active)`,
          { count: "exact" }
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (q) query = query.ilike("name", `%${q}%`);
      if (status === "active") query = query.eq("is_active", true);
      if (status === "inactive") query = query.eq("is_active", false);
      if (categoryId) query = query.eq("category_id", categoryId);

      return query;
    })(),
  ]);

  const { data: products, count } = productsResult;
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Produk</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {count ?? 0} produk{q ? ` untuk "${q}"` : ""}
          </p>
        </div>
        <Button
          asChild
          className="rounded-none font-bold uppercase tracking-widest text-xs bg-[#EA5329] hover:bg-[#D44820] text-white border-0 h-9 px-4 shrink-0"
        >
          <Link href="/admin/products/new">
            <Plus size={13} className="mr-1.5" />
            Tambah Produk
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Suspense>
        <ProductFilters categories={categories ?? []} />
      </Suspense>

      {/* Table */}
      <Suspense>
        <ProductTable
          products={(products ?? []) as ProductRow[]}
          page={page}
          totalPages={totalPages}
          searchParams={{
            q: params.q,
            status: params.status,
            category: params.category,
            page: params.page,
          }}
        />
      </Suspense>
    </div>
  );
}
