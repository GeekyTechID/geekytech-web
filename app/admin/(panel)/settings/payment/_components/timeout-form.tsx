"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { saveSetting } from "../../_actions";

const labelClass = "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground";
const saveClass =
  "h-10 shrink-0 rounded-full bg-brand px-6 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50";

interface TimeoutFormProps {
  initialValue: number;
}

export function TimeoutForm({ initialValue }: TimeoutFormProps) {
  const [hours, setHours] = useState(String(initialValue));
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const parsed = parseInt(hours, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      toast.error("Masukkan jumlah jam yang valid (minimum 1).");
      return;
    }
    startTransition(async () => {
      const { error } = await saveSetting("payment_timeout_hours", parsed);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Batas waktu pembayaran diperbarui.");
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
      <div className="space-y-1.5">
        <label className={labelClass}>Batas Waktu (Jam)</label>
        <Input
          type="number"
          min={1}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="h-10 w-full max-w-[7rem] rounded-lg border-[#e0e0e0] text-sm dark:border-border sm:w-28"
        />
      </div>
      <button type="button" onClick={handleSave} disabled={isPending} className={saveClass}>
        {isPending ? "Menyimpan..." : "Simpan"}
      </button>
    </div>
  );
}
