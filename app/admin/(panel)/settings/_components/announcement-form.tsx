"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveSetting } from "../_actions";

const labelClass = "text-[11px] font-semibold uppercase text-muted-foreground";
const saveClass =
  "h-10 rounded-full bg-brand px-6 text-xs font-semibold uppercase text-white transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50";

interface AnnouncementFormProps {
  initialText: string;
  initialActive: boolean;
}

export function AnnouncementForm({ initialText, initialActive }: AnnouncementFormProps) {
  const [text, setText] = useState(initialText);
  const [isActive, setIsActive] = useState(initialActive);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const { error } = await saveSetting("announcement_bar", { text, is_active: isActive });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Announcement bar diperbarui.");
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className={labelClass}>Teks Pengumuman</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Gratis ongkir untuk pembelian di atas Rp 200.000!"
          rows={3}
          className="w-full resize-none rounded-lg border border-[#e0e0e0] bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-border"
        />
      </div>
      <div className="space-y-1.5">
        <label className={labelClass}>Status</label>
        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          className={cn(
            "flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold uppercase transition-colors",
            isActive
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400"
              : "border-[#e0e0e0] bg-muted text-muted-foreground dark:border-border",
          )}
        >
          {isActive ? "Aktif" : "Nonaktif"}
        </button>
      </div>
      <button type="button" onClick={handleSave} disabled={isPending} className={saveClass}>
        {isPending ? "Menyimpan..." : "Simpan"}
      </button>
    </div>
  );
}
