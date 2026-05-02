"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveSetting } from "../_actions";

interface MaintenanceToggleProps {
  initialValue: boolean;
}

export function MaintenanceToggle({ initialValue }: MaintenanceToggleProps) {
  const [isActive, setIsActive] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const next = !isActive;
    startTransition(async () => {
      const { error } = await saveSetting("maintenance_mode", next);
      if (error) {
        toast.error(error);
        return;
      }
      setIsActive(next);
      toast.success(next ? "Maintenance mode diaktifkan." : "Maintenance mode dinonaktifkan.");
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        "flex h-9 items-center gap-2 border border-border px-4 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50",
        isActive
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
          : "bg-muted text-muted-foreground"
      )}
    >
      {isPending ? "Menyimpan..." : isActive ? "Aktif — Klik untuk menonaktifkan" : "Nonaktif — Klik untuk mengaktifkan"}
    </button>
  );
}
