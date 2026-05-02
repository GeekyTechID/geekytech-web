"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { saveSetting } from "../../_actions";

interface TimeoutFormProps {
  initialValue: number;
}

export function TimeoutForm({ initialValue }: TimeoutFormProps) {
  const [hours, setHours] = useState(String(initialValue));
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const parsed = parseInt(hours, 10);
    if (isNaN(parsed) || parsed < 1) {
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
    <div className="flex items-end gap-3">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Batas Waktu (Jam)
        </label>
        <Input
          type="number"
          min={1}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="h-9 w-28 rounded-none text-sm"
        />
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
