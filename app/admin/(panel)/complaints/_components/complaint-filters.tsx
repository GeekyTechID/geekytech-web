"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "open", label: "Baru" },
  { value: "in_review", label: "Ditinjau" },
  { value: "resolved", label: "Selesai" },
  { value: "rejected", label: "Ditolak" },
];

export function ComplaintFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const hasFilters = Boolean(q) || status !== "all";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-0 flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={inputRef}
          placeholder="Cari no. order / nama pelanggan..."
          defaultValue={q}
          onChange={(e) => {
            const val = e.target.value;
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => updateParam("q", val), 400);
          }}
          className="h-11 rounded-full border-[#e0e0e0] pl-10 pr-10 text-[17px] leading-[1.47] dark:border-border"
        />
        {q && (
          <button
            type="button"
            aria-label="Hapus pencarian"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              updateParam("q", "");
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <Select
        value={status}
        onValueChange={(v) => updateParam("status", v)}
      >
        <SelectTrigger className="w-[13rem] shrink-0">
          <SelectValue placeholder="Semua Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 gap-1.5 border-dashed text-muted-foreground"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = "";
            router.push(pathname);
          }}
        >
          <X size={12} />
          Reset
        </Button>
      )}
    </div>
  );
}
