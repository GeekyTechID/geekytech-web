"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { saveSetting } from "../_actions";

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
    <div className="flex items-end gap-3">
      <div className="flex-1 space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Nomor WhatsApp (format: 628xxx)
        </label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="6281234567890"
          className="h-9 rounded-none text-sm"
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
