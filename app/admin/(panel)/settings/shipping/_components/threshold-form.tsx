"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { saveSetting } from "../../_actions";

interface ThresholdFormProps {
  initialValue: number;
}

export function ThresholdForm({ initialValue }: ThresholdFormProps) {
  const [value, setValue] = useState(String(initialValue));
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const parsed = parseInt(value.replace(/\D/g, ""), 10);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Masukkan nominal yang valid.");
      return;
    }
    startTransition(async () => {
      const { error } = await saveSetting("free_shipping_threshold", parsed);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Threshold free ongkir diperbarui.");
    });
  };

  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Minimum Pembelian (Rp)
        </label>
        <div className="flex items-center border border-border h-9">
          <span className="px-3 text-sm text-muted-foreground border-r border-border h-full flex items-center">
            Rp
          </span>
          <Input
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-full rounded-none border-0 text-sm focus-visible:ring-0 w-40"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="h-10 px-6 bg-swiss-black text-swiss-white text-xs font-black uppercase tracking-widest transition-opacity disabled:opacity-50"
      >
        {isPending ? "Menyimpan..." : "Simpan"}
      </button>
    </div>
  );
}
