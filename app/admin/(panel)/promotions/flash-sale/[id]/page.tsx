import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { FlashSaleForm } from "../_components/flash-sale-form";
import {
  FlashSaleProducts,
  type FlashSaleProductRow,
  type VariantOption,
} from "./_components/flash-sale-products";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("flash_sales")
    .select("name")
    .eq("id", id)
    .single();
  return { title: `${data?.name ?? "Flash Sale"} — Admin GeekyTech` };
}

function getStatusInfo(sale: {
  is_active: boolean;
  starts_at: string;
  ends_at: string;
}): { label: string; className: string } {
  const now = new Date();
  const starts = new Date(sale.starts_at);
  const ends = new Date(sale.ends_at);

  if (!sale.is_active) {
    return { label: "Nonaktif", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" };
  }
  if (now < starts) {
    return { label: "Terjadwal", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" };
  }
  if (now >= starts && now <= ends) {
    return { label: "Berlangsung", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
  }
  return { label: "Berakhir", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" };
}

export default async function AdminFlashSaleDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: sale } = await supabase
    .from("flash_sales")
    .select("id, name, starts_at, ends_at, is_active, created_at")
    .eq("id", id)
    .single();

  if (!sale) notFound();

  const { data: fspData } = await supabase
    .from("flash_sale_products")
    .select(
      `id, variant_id, sale_price, quota, sold,
       product_variants:variant_id (
         name, sku, price,
         products:product_id (name, slug)
       )`
    )
    .eq("flash_sale_id", id)
    .order("sale_price", { ascending: true });

  // Get all active variants not yet in this flash sale
  const existingVariantIds = (fspData ?? []).map((r) => r.variant_id);

  const { data: allVariants } = await supabase
    .from("product_variants")
    .select(`id, name, sku, price, products:product_id (name)`)
    .eq("is_active", true)
    .order("price", { ascending: true });

  const availableVariants: VariantOption[] = (allVariants ?? [])
    .filter((v) => !existingVariantIds.includes(v.id))
    .map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      product_name: Array.isArray(v.products)
        ? (v.products[0]?.name ?? "—")
        : ((v.products as { name: string } | null)?.name ?? "—"),
    }));

  const statusInfo = getStatusInfo(sale);

  return (
    <div className="space-y-6 p-6">
      {/* Back + header */}
      <div>
        <Link
          href="/admin/promotions/flash-sale"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft size={13} />
          Kembali ke daftar flash sale
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">{sale.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatDate(sale.starts_at)} — {formatDate(sale.ends_at)}
            </p>
          </div>
          <span
            className={cn(
              "inline-block px-3 py-1 text-xs font-black uppercase tracking-widest",
              statusInfo.className
            )}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left: edit form */}
        <div className="xl:col-span-1">
          <div className="border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-xs font-black uppercase tracking-widest">Edit Flash Sale</h2>
            </div>
            <div className="p-4">
              <FlashSaleForm
                initialData={sale}
                redirectTo={`/admin/promotions/flash-sale/${id}`}
              />
            </div>
          </div>
        </div>

        {/* Right: products */}
        <div className="xl:col-span-2">
          <FlashSaleProducts
            flashSaleId={id}
            products={(fspData ?? []) as FlashSaleProductRow[]}
            availableVariants={availableVariants}
          />
        </div>
      </div>
    </div>
  );
}
