"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveSetting } from "../_actions";

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
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Teks Pengumuman
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Gratis ongkir untuk pembelian di atas Rp 200.000!"
          rows={3}
          className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none rounded-none"
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
            "flex h-9 items-center gap-2 border border-border px-4 text-xs font-bold uppercase tracking-widest transition-colors",
            isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isActive ? "Aktif" : "Nonaktif"}
        </button>
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
