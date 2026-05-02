"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createCoupon, updateCoupon, type CouponFormData } from "../_actions";

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
  const [validFrom, setValidFrom] = useState(
    initialData?.valid_from ? initialData.valid_from.slice(0, 16) : ""
  );
  const [validUntil, setValidUntil] = useState(
    initialData?.valid_until ? initialData.valid_until.slice(0, 16) : ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numValue = parseFloat(value);
    const numMinPurchase = parseFloat(minPurchase) || 0;
    const numMaxDiscount = maxDiscount ? parseFloat(maxDiscount) : null;
    const numMaxUsage = maxUsage ? parseInt(maxUsage) : null;

    if (!code.trim()) { toast.error("Kode kupon wajib diisi."); return; }
    if (isNaN(numValue) || numValue <= 0) { toast.error("Nilai diskon harus lebih dari 0."); return; }
    if (type === "percentage" && numValue > 100) { toast.error("Persentase tidak boleh lebih dari 100%."); return; }
    if (numMaxDiscount !== null && numMaxDiscount <= 0) { toast.error("Maks. diskon harus lebih dari 0."); return; }
    if (numMaxUsage !== null && numMaxUsage <= 0) { toast.error("Maks. pemakaian harus lebih dari 0."); return; }
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
        if (error) { toast.error(error); return; }
        toast.success("Kupon diperbarui.");
        router.push("/admin/coupons");
      } else {
        const { error } = await createCoupon(data);
        if (error) { toast.error(error); return; }
        toast.success("Kupon berhasil dibuat.");
        router.push("/admin/coupons");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informasi Utama */}
      <div className="border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-xs font-black uppercase tracking-widest">Informasi Kupon</h2>
        </div>
        <div className="p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Kode */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Kode Kupon *
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="DISKON10"
              className="h-9 rounded-none font-mono text-sm uppercase"
              required
            />
            <p className="text-[10px] text-muted-foreground">Kode otomatis dikonversi ke huruf kapital.</p>
          </div>

          {/* Tipe Diskon */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tipe Diskon *
            </label>
            <div className="flex border border-border h-9">
              <button
                type="button"
                onClick={() => setType("percentage")}
                className={cn(
                  "flex-1 text-xs font-bold uppercase tracking-widest transition-colors",
                  type === "percentage"
                    ? "bg-swiss-black text-swiss-white"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                Persentase (%)
              </button>
              <button
                type="button"
                onClick={() => setType("fixed")}
                className={cn(
                  "flex-1 border-l border-border text-xs font-bold uppercase tracking-widest transition-colors",
                  type === "fixed"
                    ? "bg-swiss-black text-swiss-white"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                Nominal (Rp)
              </button>
            </div>
          </div>

          {/* Nilai Diskon */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Nilai Diskon *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
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
                className="h-9 rounded-none pl-8 text-sm"
                required
              />
            </div>
          </div>

          {/* Min. Belanja */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Min. Belanja
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                Rp
              </span>
              <Input
                type="number"
                value={minPurchase}
                onChange={(e) => setMinPurchase(e.target.value)}
                placeholder="0"
                min={0}
                step={1000}
                className="h-9 rounded-none pl-8 text-sm"
              />
            </div>
          </div>

          {/* Maks. Diskon (hanya untuk persentase) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Maks. Diskon{type === "percentage" ? "" : " (N/A)"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
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
                className="h-9 rounded-none pl-8 text-sm disabled:opacity-40"
              />
            </div>
            {type === "percentage" && (
              <p className="text-[10px] text-muted-foreground">Kosongkan jika tidak ada batas nominal.</p>
            )}
          </div>
        </div>
      </div>

      {/* Batas Penggunaan & Masa Berlaku */}
      <div className="border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-xs font-black uppercase tracking-widest">Batas & Masa Berlaku</h2>
        </div>
        <div className="p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Maks. Pemakaian */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Maks. Pemakaian
            </label>
            <Input
              type="number"
              value={maxUsage}
              onChange={(e) => setMaxUsage(e.target.value)}
              placeholder="Tidak terbatas"
              min={1}
              step={1}
              className="h-9 rounded-none text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Kosongkan untuk tidak terbatas.</p>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Status
            </label>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={cn(
                "flex h-9 w-full items-center justify-center gap-2 border border-border text-xs font-bold uppercase tracking-widest transition-colors",
                isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isActive ? "Aktif" : "Nonaktif"}
            </button>
          </div>

          {/* Berlaku Mulai */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Berlaku Mulai
            </label>
            <Input
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className="h-9 rounded-none text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Kosongkan jika langsung berlaku.</p>
          </div>

          {/* Berlaku Hingga */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Berlaku Hingga
            </label>
            <Input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="h-9 rounded-none text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Kosongkan jika tidak ada batas waktu.</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-6 bg-swiss-black text-swiss-white text-xs font-black uppercase tracking-widest transition-opacity disabled:opacity-50"
        >
          {isPending ? "Menyimpan..." : initialData ? "Perbarui Kupon" : "Buat Kupon"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/coupons")}
          disabled={isPending}
          className="h-10 px-4 border border-border text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
