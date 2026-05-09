"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createFlashSale, updateFlashSale, type FlashSaleFormData } from "../_actions";

type FlashSaleFormProps = {
  initialData?: {
    id: string;
    name: string;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
  };
  redirectTo?: string;
};

export function FlashSaleForm({ initialData, redirectTo }: FlashSaleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialData?.name ?? "");
  const [startsAt, setStartsAt] = useState(
    initialData?.starts_at ? initialData.starts_at.slice(0, 16) : ""
  );
  const [endsAt, setEndsAt] = useState(
    initialData?.ends_at ? initialData.ends_at.slice(0, 16) : ""
  );
  const [isActive, setIsActive] = useState(initialData?.is_active ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) { toast.error("Nama flash sale wajib diisi."); return; }
    if (!startsAt) { toast.error("Waktu mulai wajib diisi."); return; }
    if (!endsAt) { toast.error("Waktu berakhir wajib diisi."); return; }
    if (new Date(endsAt) <= new Date(startsAt)) {
      toast.error("Waktu berakhir harus setelah waktu mulai.");
      return;
    }

    const data: FlashSaleFormData = {
      name: name.trim(),
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      is_active: isActive,
    };

    startTransition(async () => {
      if (initialData) {
        const { error } = await updateFlashSale(initialData.id, data);
        if (error) { toast.error(error); return; }
        toast.success("Flash sale diperbarui.");
        router.push(redirectTo ?? `/admin/promotions/flash-sale/${initialData.id}`);
      } else {
        const { error, id } = await createFlashSale(data);
        if (error || !id) { toast.error(error ?? "Gagal membuat flash sale."); return; }
        toast.success("Flash sale berhasil dibuat.");
        router.push(redirectTo ?? `/admin/promotions/flash-sale/${id}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-xs font-black uppercase tracking-widest">Informasi Flash Sale</h2>
        </div>
        <div className="p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Nama Flash Sale *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Flash Sale 12.12"
              className="h-9 rounded-none text-sm"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Mulai *
            </label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="h-9 rounded-none text-sm"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Berakhir *
            </label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="h-9 rounded-none text-sm"
              required
            />
          </div>
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
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-6 bg-swiss-black text-swiss-white text-xs font-black uppercase tracking-widest transition-opacity disabled:opacity-50"
        >
          {isPending ? "Menyimpan..." : initialData ? "Perbarui" : "Buat Flash Sale"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/promotions/flash-sale")}
          disabled={isPending}
          className="h-10 px-4 border border-border text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
