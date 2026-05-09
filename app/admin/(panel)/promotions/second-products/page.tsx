import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PromotionTable, type PromotionTableRow } from "../_components/promotion-table";

export const metadata: Metadata = { title: "Produk Second — Promosi Admin GeekyTech" };
export const dynamic = "force-dynamic";

const BASE_PATH = "/admin/promotions/second-products";

export default async function SecondProductsPage() {
  const supabase = await createClient();

  const { data: promos } = await supabase
    .from("promotions")
    .select("id, type, title, subtitle, is_active, max_items, selection_mode, created_at")
    .eq("type", "second_products")
    .order("created_at", { ascending: false });

  const ids = (promos ?? []).map((p) => p.id);
  const productCountMap: Record<string, number> = {};
  const brandCountMap: Record<string, number> = {};

  if (ids.length > 0) {
    const [{ data: pp }, { data: pb }] = await Promise.all([
      supabase.from("promotion_products").select("promotion_id").in("promotion_id", ids),
      supabase.from("promotion_brands").select("promotion_id").in("promotion_id", ids),
    ]);
    for (const r of pp ?? []) if (r.promotion_id) productCountMap[r.promotion_id] = (productCountMap[r.promotion_id] ?? 0) + 1;
    for (const r of pb ?? []) if (r.promotion_id) brandCountMap[r.promotion_id] = (brandCountMap[r.promotion_id] ?? 0) + 1;
  }

  const rows: PromotionTableRow[] = (promos ?? []).map((p) => ({
    id: p.id,
    type: p.type as import("../_actions").PromotionType,
    title: p.title,
    subtitle: p.subtitle,
    is_active: p.is_active ?? false,
    max_items: p.max_items ?? 0,
    selection_mode: (p.selection_mode ?? "manual") as "manual" | "brand",
    created_at: p.created_at ?? new Date().toISOString(),
    product_count: productCountMap[p.id] ?? 0,
    brand_count: brandCountMap[p.id] ?? 0,
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Produk Second Terbaik</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {rows.length} promosi · Tampilkan produk second pilihan di halaman publik
          </p>
        </div>
        <Link
          href={`${BASE_PATH}/new`}
          className="flex items-center gap-2 h-11 px-4 bg-swiss-black text-swiss-white text-xs font-black uppercase tracking-widest transition-opacity hover:opacity-80"
        >
          <Plus size={14} />
          Buat Promosi
        </Link>
      </div>
      <PromotionTable rows={rows} basePath={BASE_PATH} emptyLabel="Belum ada promosi produk second" />
    </div>
  );
}
