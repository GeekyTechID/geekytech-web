import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { FlashSaleTable, type FlashSaleRow } from "./_components/flash-sale-table";

export const metadata: Metadata = { title: "Flash Sale — Admin GeekyTech" };
export const dynamic = "force-dynamic";

export default async function AdminFlashSalePage() {
  const supabase = await createClient();

  const { data: flashSales } = await supabase
    .from("flash_sales")
    .select("id, name, starts_at, ends_at, is_active, created_at")
    .order("starts_at", { ascending: false });

  // Get product count per flash sale
  const ids = flashSales?.map((s) => s.id) ?? [];
  const productCountMap: Record<string, number> = {};

  if (ids.length > 0) {
    const { data: fsp } = await supabase
      .from("flash_sale_products")
      .select("flash_sale_id")
      .in("flash_sale_id", ids);

    for (const row of fsp ?? []) {
      productCountMap[row.flash_sale_id] = (productCountMap[row.flash_sale_id] ?? 0) + 1;
    }
  }

  const rows: FlashSaleRow[] = (flashSales ?? []).map((s) => ({
    ...s,
    product_count: productCountMap[s.id] ?? 0,
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Flash Sale</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {flashSales?.length ?? 0} flash sale
          </p>
        </div>
        <Link
          href="/admin/flash-sale/new"
          className="flex items-center gap-2 h-9 px-4 bg-swiss-black text-swiss-white text-xs font-black uppercase tracking-widest transition-opacity"
        >
          <Plus size={14} />
          Buat Flash Sale
        </Link>
      </div>

      {/* Table */}
      <FlashSaleTable flashSales={rows} />
    </div>
  );
}
