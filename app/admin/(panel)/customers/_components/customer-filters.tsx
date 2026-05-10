"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

export function CustomerFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = searchParams.get("q") ?? "";

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

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative max-w-md flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Cari nama atau nomor HP..."
          defaultValue={q}
          onChange={(e) => {
            const val = e.target.value;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => updateParam("q", val), 400);
          }}
          className="h-11 rounded-full border-[#e0e0e0] pl-10 text-[17px] leading-[1.47] dark:border-border"
        />
      </div>

      {q ? (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-[#e0e0e0] px-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground dark:border-border"
        >
          <X size={12} />
          Reset
        </button>
      ) : null}
    </div>
  );
}
