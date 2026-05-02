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
  in: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  out: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  reserved: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  released: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  adjustment: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
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
    .select(
      "id, name, sku, stock, reserved, is_active, products!inner(name, slug)",
    )
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Stok</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalVariants} varian{alertOnly ? " stok kritis" : ""}
          </p>
        </div>
        <Link
          href={alertOnly ? "/admin/stock" : "/admin/stock?alert=1"}
          className={cn(
            "flex items-center gap-2 h-9 px-4 border text-xs font-bold uppercase tracking-widest transition-swiss",
            alertOnly
              ? "bg-swiss-black text-swiss-white border-swiss-black"
              : "border-border hover:bg-muted",
          )}
        >
          <AlertTriangle size={13} />
          Stok Kritis
        </Link>
      </div>

      {/* Alert Banner */}
      {outOfStockCount > 0 && (
        <div className="flex items-center gap-3 border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3">
          <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            {outOfStockCount} varian habis stok
          </p>
        </div>
      )}

      {/* Stock Table */}
      <div className="bg-background border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {["Produk", "Varian", "SKU", "Stok", "Reserved", "Tersedia", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {variants.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-sm text-muted-foreground"
                >
                  Tidak ada varian ditemukan
                </td>
              </tr>
            ) : (
              variants.map((v) => {
                const productName = Array.isArray(v.products)
                  ? v.products[0]?.name
                  : v.products?.name;
                const productSlug = Array.isArray(v.products)
                  ? v.products[0]?.slug
                  : v.products?.slug;
                const available = v.stock - v.reserved;
                const badgeCls =
                  v.stock === 0
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : v.stock <= 5
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                const badgeLabel =
                  v.stock === 0 ? "Habis" : v.stock <= 5 ? "Kritis" : "Aman";

                return (
                  <tr key={v.id} className="hover:bg-muted/50 transition-swiss">
                    <td className="px-5 py-3 font-medium">
                      <Link
                        href={`/admin/products?q=${encodeURIComponent(productName ?? "")}`}
                        className="hover:text-[#EA5329] transition-swiss"
                      >
                        {productName ?? "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{v.name}</td>
                    <td className="px-5 py-3 font-mono text-xs">{v.sku}</td>
                    <td className="px-5 py-3 font-black">{v.stock}</td>
                    <td className="px-5 py-3 text-muted-foreground">{v.reserved}</td>
                    <td className="px-5 py-3 font-semibold">
                      {Math.max(0, available)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
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

      {/* Stock History */}
      <div className="bg-background border border-border">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-xs font-bold uppercase tracking-widest">
            Riwayat Stok (50 Terakhir)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Tanggal", "Produk / Varian", "Tipe", "Jumlah", "Catatan"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-muted-foreground"
                  >
                    Belum ada riwayat stok
                  </td>
                </tr>
              ) : (
                history.map((h) => {
                  const variant = Array.isArray(h.product_variants)
                    ? h.product_variants[0]
                    : h.product_variants;
                  const productName = variant
                    ? Array.isArray(variant.products)
                      ? variant.products[0]?.name
                      : variant.products?.name
                    : null;
                  const typeCls =
                    HISTORY_TYPE_BADGE[h.type as StockHistoryType] ??
                    HISTORY_TYPE_BADGE.adjustment;
                  const typeLabel =
                    HISTORY_TYPE_LABEL[h.type as StockHistoryType] ?? h.type;

                  return (
                    <tr key={h.id} className="hover:bg-muted/50 transition-swiss">
                      <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
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
                        {variant && (
                          <p className="text-xs text-muted-foreground">
                            {variant.name} · {variant.sku}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                            typeCls,
                          )}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-black">
                        {h.quantity > 0 ? `+${h.quantity}` : h.quantity}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {h.note ?? "—"}
                      </td>
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
