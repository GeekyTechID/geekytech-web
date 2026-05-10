"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { saveSetting } from "../_actions";

const labelClass = "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground";
const saveClass =
  "h-10 shrink-0 rounded-full bg-brand px-6 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50";

interface WhatsappFormProps {
  initialValue: string;
}

export function WhatsappForm({ initialValue }: WhatsappFormProps) {
  const [phone, setPhone] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const { error } = await saveSetting("whatsapp_cs", phone.trim());
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Nomor WhatsApp CS diperbarui.");
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-1.5">
        <label className={labelClass}>Nomor WhatsApp (format: 628xxx)</label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="6281234567890"
          className="h-10 rounded-lg border-[#e0e0e0] text-sm dark:border-border"
        />
      </div>
      <button type="button" onClick={handleSave} disabled={isPending} className={saveClass}>
        {isPending ? "Menyimpan..." : "Simpan"}
      </button>
    </div>
  );
}
