"use client";

import { useState } from "react";
import Link from "next/link";

import { CartLineCard } from "@/components/store/cart-line-card";
import type { CartLineView } from "@/components/store/cart-line-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CartClientShell({ lines }: { lines: CartLineView[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(lines.map((l) => l.lineId)),
  );

  const allSelected = lines.length > 0 && selectedIds.size === lines.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < lines.length;

  const selectedLines = lines.filter((l) => selectedIds.has(l.lineId));
  const itemCount = selectedLines.reduce((s, l) => s + l.qty, 0);
  const subtotalGross = selectedLines.reduce((s, l) => s + l.listPrice * l.qty, 0);
  const subtotal = selectedLines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const discountTotal = Math.max(0, subtotalGross - subtotal);
  const serviceFee = 1000;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(lines.map((l) => l.lineId)));
  };

  const toggleLine = (lineId: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });

  return (
    <div className="mt-6 md:mt-8 md:grid md:grid-cols-12 md:items-start md:gap-6 lg:gap-8">
      <div className="md:col-span-7">
        <div className="rounded-2xl border border-[#e8e4dc] bg-[#faf8f4] p-3 sm:p-4 md:p-5">
          {/* Select all */}
          <div className="mb-5 flex items-center gap-3 border-b border-[#e8e4dc] pb-4">
            <Checkbox
              id="select-all"
              checked={someSelected ? "indeterminate" : allSelected}
              onCheckedChange={toggleAll}
              className="h-5 w-5"
            />
            <label htmlFor="select-all" className="cursor-pointer select-none text-sm font-semibold text-[#1d1d1f]">
              Pilih semua ({lines.length} produk)
            </label>
          </div>

          <ul className="space-y-10">
            {lines.map((line) => (
              <li key={line.lineId}>
                <CartLineCard
                  line={line}
                  checked={selectedIds.has(line.lineId)}
                  onCheckedChange={() => toggleLine(line.lineId)}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside className="mt-6 md:col-span-5 md:mt-0">
        <div className="rounded-2xl bg-[#1a1a1a] p-5 text-white shadow-lg sm:p-6 md:sticky md:top-24 md:max-h-[calc(100vh-8rem)] md:overflow-y-auto">
          <h2 className="text-lg font-bold">Ringkasan pesanan</h2>
          <dl className="mt-6 space-y-4 border-b border-white/15 pb-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/75">
                Sub total ({itemCount} item)
              </dt>
              <dd className="shrink-0 font-semibold tabular-nums">{formatRupiah(subtotalGross)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/75">Diskon produk</dt>
              <dd className={cn("shrink-0 font-semibold tabular-nums", discountTotal > 0 && "text-[#EA5329]")}>
                {discountTotal > 0 ? `−${formatRupiah(discountTotal)}` : formatRupiah(0)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/75">Biaya jasa aplikasi</dt>
              <dd className="shrink-0 font-semibold tabular-nums">{formatRupiah(serviceFee)}</dd>
            </div>
          </dl>
          <div className="mt-6 flex justify-between gap-4 text-lg font-black tabular-nums">
            <span>Total</span>
            <span>{formatRupiah(subtotal + serviceFee)}</span>
          </div>

          {selectedIds.size === 0 ? (
            <Button variant="primary" className="mt-6 w-full opacity-50" disabled>
              Pilih produk dahulu
            </Button>
          ) : (
            <Button asChild variant="primary" className="mt-6 w-full">
              <Link href={`/checkout?items=${[...selectedIds].join(",")}`}>
                Beli sekarang ({selectedIds.size} produk)
              </Link>
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}
