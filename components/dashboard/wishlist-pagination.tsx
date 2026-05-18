"use client";

import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

function buildUrl(searchParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(searchParams.toString());
  if (page <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(page));
  }
  const qs = params.toString();
  return qs ? `/dashboard/wishlist?${qs}` : "/dashboard/wishlist";
}

export function WishlistPagination({
  total,
  perPage,
  currentPage,
}: {
  total: number;
  perPage: number;
  currentPage: number;
}) {
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  const btnBase =
    "flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border px-2 text-sm font-medium transition";

  return (
    <div className="mt-6 flex items-center justify-between gap-2">
      <p className="text-xs text-[#7a7a7a]">
        Halaman {currentPage} dari {totalPages} · {total} item
      </p>
      <div className="flex items-center gap-1">
        <a
          href={buildUrl(searchParams, currentPage - 1)}
          aria-disabled={currentPage <= 1}
          className={cn(
            btnBase,
            "border-[#e0e0e0] bg-white text-[#1d1d1f]",
            currentPage <= 1 && "pointer-events-none opacity-40",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </a>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-sm text-[#7a7a7a]">
              …
            </span>
          ) : (
            <a
              key={p}
              href={buildUrl(searchParams, p)}
              className={cn(
                btnBase,
                p === currentPage
                  ? "border-[#EA5329] bg-[#EA5329] text-white"
                  : "border-[#e0e0e0] bg-white text-[#1d1d1f] hover:border-[#EA5329]/40",
              )}
            >
              {p}
            </a>
          ),
        )}

        <a
          href={buildUrl(searchParams, currentPage + 1)}
          aria-disabled={currentPage >= totalPages}
          className={cn(
            btnBase,
            "border-[#e0e0e0] bg-white text-[#1d1d1f]",
            currentPage >= totalPages && "pointer-events-none opacity-40",
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
