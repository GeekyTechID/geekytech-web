"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

export function CustomerFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex gap-3">
      <div className="relative max-w-sm flex-1">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Cari nama atau nomor HP..."
          defaultValue={q}
          onChange={(e) => {
            const val = e.target.value;
            const tid = setTimeout(() => updateParam("q", val), 400);
            return () => clearTimeout(tid);
          }}
          className="h-9 rounded-none pl-8 text-sm"
        />
      </div>

      {q && (
        <button
          onClick={() => router.push(pathname)}
          className="flex h-11 items-center gap-1.5 border border-dashed border-border px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={12} />
          Reset
        </button>
      )}
    </div>
  );
}
