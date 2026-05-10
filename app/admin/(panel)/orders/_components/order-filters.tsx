"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "pending_payment", label: "Menunggu Bayar" },
  { value: "paid", label: "Dibayar" },
  { value: "processing", label: "Diproses" },
  { value: "shipped", label: "Dikirim" },
  { value: "delivered", label: "Terkirim" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "refunded", label: "Refund" },
];

export function OrderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const hasFilters = Boolean(q) || status !== "all";

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Cari no. order / nama penerima..."
          defaultValue={q}
          onChange={(e) => {
            const val = e.target.value;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => updateParam("q", val), 400);
          }}
          className="h-11 rounded-full border-[#e0e0e0] pl-10 text-[17px] leading-[1.47] dark:border-border"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="inline-flex max-w-full flex-wrap overflow-hidden rounded-lg border border-[#e0e0e0] dark:border-border">
          {STATUS_OPTIONS.map(({ value, label }, i) => (
            <button
              key={value}
              type="button"
              onClick={() => updateParam("status", value === "all" ? "" : value)}
              className={cn(
                "h-10 border-[#e0e0e0] px-3 text-xs font-semibold uppercase tracking-widest transition-colors dark:border-border",
                i > 0 ? "border-l" : "",
                (value === "all" ? status === "all" : status === value)
                  ? "bg-brand/10 text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-[#e0e0e0] px-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground dark:border-border"
          >
            <X size={12} />
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
