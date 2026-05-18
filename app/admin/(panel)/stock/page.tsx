import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Stok — Admin GeekyTech" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ alert?: string }>;

type StockHistoryType = "in" | "out" | "reserved" | "released" | "adjustment";

const HISTORY_TYPE_BADGE: Record<StockHistoryType, string> = {
  in: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400",
  out: "bg-destructive/10 text-destructive dark:text-destructive",
  reserved: "bg-brand/10 text-brand",
  released: "bg-muted text-muted-foreground",
  adjustment: "bg-muted text-foreground",
};

const HISTORY_TYPE_LABEL: Record<StockHistoryType, string> = {
  in: "Masuk",
  out: "Keluar",
  reserved: "Reserved",
  released: "Released",
  adjustment: "Penyesuaian",
};

type VariantRow = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  reserved: number;
  is_active: boolean;
  products: { name: string; slug: string } | { name: string; slug: string }[];
};

type HistoryRow = {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  created_at: string;
  product_variants:
    | { name: string; sku: string; products: { name: string } | { name: string }[] }
    | { name: string; sku: string; products: { name: string } | { name: string }[] }[];
};

async function fetchStockData(alertOnly: boolean) {
  const supabase = await createClient();

  let variantQuery = supabase
    .from("product_variants")
    .select("id, name, sku, stock, reserved, is_active, products!inner(name, slug)")
    .eq("is_active", true)
    .order("stock", { ascending: true });

  if (alertOnly) {
    variantQuery = variantQuery.lte("stock", 5);
  }

  const [variants, history] = await Promise.all([
    variantQuery,
    supabase
      .from("stock_history")
      .select(
        "id, type, quantity, note, created_at, product_variants!inner(name, sku, products!inner(name))",
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return {
    variants: (variants.data ?? []) as VariantRow[],
    history: (history.data ?? []) as HistoryRow[],
  };
}

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const alertOnly = params.alert === "1";

  const { variants, history } = await fetchStockData(alertOnly);

  const outOfStockCount = variants.filter((v) => v.stock === 0).length;
  const totalVariants = variants.length;

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Inventaris</p>
          <h1 className="text-[34px] font-semibold uppercase text-foreground">Stok</h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">
            {totalVariants} varian{alertOnly ? " stok kritis" : ""}
          </p>
        </div>
        <Link
          href={alertOnly ? "/admin/stock" : "/admin/stock?alert=1"}
          className={cn(
            "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-5 text-xs font-semibold uppercase transition-opacity active:scale-[0.98]",
            alertOnly
              ? "border-transparent bg-brand text-white hover:opacity-90"
              : "border-[#e0e0e0] text-muted-foreground hover:border-brand/40 hover:text-foreground dark:border-border",
          )}
        >
          <AlertTriangle size={13} />
          Stok Kritis
        </Link>
      </div>

      {outOfStockCount > 0 ? (
        <div className="admin-utility-card flex items-center gap-3 border-destructive/20 bg-destructive/5 px-4 py-3 dark:border-destructive/30">
          <AlertTriangle size={16} className="shrink-0 text-destructive" />
          <p className="text-sm font-semibold text-destructive dark:text-destructive">{outOfStockCount} varian habis stok</p>
        </div>
      ) : null}

      <div className="admin-utility-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0] text-left dark:border-border">
                {["Produk", "Varian", "SKU", "Stok", "Reserved", "Tersedia", "Status"].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-5 py-2.5 text-[10px] font-semibold uppercase text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
              {variants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Tidak ada varian ditemukan
                  </td>
                </tr>
              ) : (
                variants.map((v) => {
                  const productName = Array.isArray(v.products) ? v.products[0]?.name : v.products?.name;
                  const available = v.stock - v.reserved;
                  const badgeCls =
                    v.stock === 0
                      ? "bg-destructive/10 text-destructive dark:text-destructive"
                      : v.stock <= 5
                        ? "bg-brand/10 text-brand"
                        : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400";
                  const badgeLabel = v.stock === 0 ? "Habis" : v.stock <= 5 ? "Kritis" : "Aman";

                  return (
                    <tr key={v.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium">
                        <Link
                          href={`/admin/products?q=${encodeURIComponent(productName ?? "")}`}
                          className="admin-text-link"
                        >
                          {productName ?? "—"}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{v.name}</td>
                      <td className="px-5 py-3 font-mono text-xs">{v.sku}</td>
                      <td className="px-5 py-3 font-semibold">{v.stock}</td>
                      <td className="px-5 py-3 text-muted-foreground">{v.reserved}</td>
                      <td className="px-5 py-3 font-semibold">{Math.max(0, available)}</td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                            badgeCls,
                          )}
                        >
                          {badgeLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-utility-card overflow-hidden p-0">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Riwayat Stok (50 Terakhir)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0] text-left dark:border-border">
                {["Tanggal", "Produk / Varian", "Tipe", "Jumlah", "Catatan"].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-5 py-2.5 text-[10px] font-semibold uppercase text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Belum ada riwayat stok
                  </td>
                </tr>
              ) : (
                history.map((h) => {
                  const variant = Array.isArray(h.product_variants) ? h.product_variants[0] : h.product_variants;
                  const productName = variant
                    ? Array.isArray(variant.products)
                      ? variant.products[0]?.name
                      : variant.products?.name
                    : null;
                  const typeCls =
                    HISTORY_TYPE_BADGE[h.type as StockHistoryType] ?? HISTORY_TYPE_BADGE.adjustment;
                  const typeLabel = HISTORY_TYPE_LABEL[h.type as StockHistoryType] ?? h.type;

                  return (
                    <tr key={h.id} className="transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-muted-foreground">
                        {formatDate(h.created_at, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium">{productName ?? "—"}</p>
                        {variant ? (
                          <p className="text-xs text-muted-foreground">
                            {variant.name} · {variant.sku}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                            typeCls,
                          )}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        {h.quantity > 0 ? `+${h.quantity}` : h.quantity}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{h.note ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
