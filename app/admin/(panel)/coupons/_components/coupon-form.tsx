"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createCoupon, updateCoupon, type CouponFormData } from "../_actions";

const labelClass = "text-[11px] font-semibold uppercase text-muted-foreground";

type InitialData = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_purchase: number;
  max_discount: number | null;
  max_usage: number | null;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
};

type CouponFormProps = {
  initialData?: InitialData;
};

export function CouponForm({ initialData }: CouponFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [code, setCode] = useState(initialData?.code ?? "");
  const [type, setType] = useState<"percentage" | "fixed">(initialData?.type ?? "percentage");
  const [value, setValue] = useState(String(initialData?.value ?? ""));
  const [minPurchase, setMinPurchase] = useState(String(initialData?.min_purchase ?? "0"));
  const [maxDiscount, setMaxDiscount] = useState(String(initialData?.max_discount ?? ""));
  const [maxUsage, setMaxUsage] = useState(String(initialData?.max_usage ?? ""));
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [validFrom, setValidFrom] = useState(initialData?.valid_from ? initialData.valid_from.slice(0, 16) : "");
  const [validUntil, setValidUntil] = useState(
    initialData?.valid_until ? initialData.valid_until.slice(0, 16) : "",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numValue = parseFloat(value);
    const numMinPurchase = parseFloat(minPurchase) || 0;
    const numMaxDiscount = maxDiscount ? parseFloat(maxDiscount) : null;
    const numMaxUsage = maxUsage ? parseInt(maxUsage, 10) : null;

    if (!code.trim()) {
      toast.error("Kode kupon wajib diisi.");
      return;
    }
    if (Number.isNaN(numValue) || numValue <= 0) {
      toast.error("Nilai diskon harus lebih dari 0.");
      return;
    }
    if (type === "percentage" && numValue > 100) {
      toast.error("Persentase tidak boleh lebih dari 100%.");
      return;
    }
    if (numMaxDiscount !== null && numMaxDiscount <= 0) {
      toast.error("Maks. diskon harus lebih dari 0.");
      return;
    }
    if (numMaxUsage !== null && numMaxUsage <= 0) {
      toast.error("Maks. pemakaian harus lebih dari 0.");
      return;
    }
    if (validFrom && validUntil && new Date(validUntil) <= new Date(validFrom)) {
      toast.error("Tanggal berakhir harus setelah tanggal mulai.");
      return;
    }

    const data: CouponFormData = {
      code,
      type,
      value: numValue,
      min_purchase: numMinPurchase,
      max_discount: numMaxDiscount,
      max_usage: numMaxUsage,
      is_active: isActive,
      valid_from: validFrom ? new Date(validFrom).toISOString() : null,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
    };

    startTransition(async () => {
      if (initialData) {
        const { error } = await updateCoupon(initialData.id, data);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Kupon diperbarui.");
        router.push("/admin/coupons");
      } else {
        const { error } = await createCoupon(data);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Kupon berhasil dibuat.");
        router.push("/admin/coupons");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Informasi Kupon</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass}>Kode Kupon *</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="DISKON10"
              className="h-10 rounded-lg border-[#e0e0e0] font-mono text-[17px] uppercase dark:border-border"
              required
            />
            <p className="text-[11px] text-muted-foreground">Kode otomatis dikonversi ke huruf kapital.</p>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Tipe Diskon *</label>
            <div className="inline-flex overflow-hidden rounded-lg border border-[#e0e0e0] dark:border-border">
              <button
                type="button"
                onClick={() => setType("percentage")}
                className={cn(
                  "h-10 flex-1 px-3 text-xs font-semibold uppercase transition-colors",
                  type === "percentage"
                    ? "bg-brand/10 text-brand"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                Persentase (%)
              </button>
              <button
                type="button"
                onClick={() => setType("fixed")}
                className={cn(
                  "h-10 flex-1 border-l border-[#e0e0e0] px-3 text-xs font-semibold uppercase transition-colors dark:border-border",
                  type === "fixed"
                    ? "bg-brand/10 text-brand"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                Nominal (Rp)
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Nilai Diskon *</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {type === "percentage" ? "%" : "Rp"}
              </span>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "percentage" ? "10" : "50000"}
                min={0}
                max={type === "percentage" ? 100 : undefined}
                step={type === "percentage" ? "1" : "1000"}
                className="h-10 rounded-lg border-[#e0e0e0] pl-9 text-[17px] dark:border-border"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Min. Belanja</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                Rp
              </span>
              <Input
                type="number"
                value={minPurchase}
                onChange={(e) => setMinPurchase(e.target.value)}
                placeholder="0"
                min={0}
                step={1000}
                className="h-10 rounded-lg border-[#e0e0e0] pl-9 text-[17px] dark:border-border"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Maks. Diskon{type === "percentage" ? "" : " (N/A)"}</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                Rp
              </span>
              <Input
                type="number"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                placeholder="Tidak terbatas"
                min={0}
                step={1000}
                disabled={type === "fixed"}
                className="h-10 rounded-lg border-[#e0e0e0] pl-9 text-[17px] disabled:opacity-40 dark:border-border"
              />
            </div>
            {type === "percentage" && (
              <p className="text-[11px] text-muted-foreground">Kosongkan jika tidak ada batas nominal.</p>
            )}
          </div>
        </div>
      </div>

      <div className="admin-utility-card overflow-hidden p-0">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Batas & Masa Berlaku</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass}>Maks. Pemakaian</label>
            <Input
              type="number"
              value={maxUsage}
              onChange={(e) => setMaxUsage(e.target.value)}
              placeholder="Tidak terbatas"
              min={1}
              step={1}
              className="h-10 rounded-lg border-[#e0e0e0] text-[17px] dark:border-border"
            />
            <p className="text-[11px] text-muted-foreground">Kosongkan untuk tidak terbatas.</p>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Status</label>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={cn(
                "flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#e0e0e0] text-xs font-semibold uppercase transition-colors dark:border-border",
                isActive
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {isActive ? "Aktif" : "Nonaktif"}
            </button>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Berlaku Mulai</label>
            <Input
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="h-10 rounded-lg border-[#e0e0e0] text-[17px] dark:border-border"
            />
            <p className="text-[11px] text-muted-foreground">Kosongkan jika langsung berlaku.</p>
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Berlaku Hingga</label>
            <Input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="h-10 rounded-lg border-[#e0e0e0] text-[17px] dark:border-border"
            />
            <p className="text-[11px] text-muted-foreground">Kosongkan jika tidak ada batas waktu.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-full border-0 bg-brand px-6 text-xs font-semibold uppercase text-white transition-opacity hover:bg-brand-hover disabled:opacity-50 active:scale-[0.98]"
        >
          {isPending ? "Menyimpan..." : initialData ? "Perbarui Kupon" : "Buat Kupon"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/coupons")}
          disabled={isPending}
          className="h-10 rounded-full border border-brand/40 px-6 text-xs font-semibold uppercase text-brand transition-colors hover:bg-brand/5 disabled:opacity-50 active:scale-[0.98]"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
