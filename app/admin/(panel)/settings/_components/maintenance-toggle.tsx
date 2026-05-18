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
        "flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold uppercase transition-colors disabled:opacity-50",
        isActive
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400"
          : "border-[#e0e0e0] bg-muted text-muted-foreground dark:border-border",
      )}
    >
      {isPending
        ? "Menyimpan..."
        : isActive
          ? "Aktif — Klik untuk menonaktifkan"
          : "Nonaktif — Klik untuk mengaktifkan"}
    </button>
  );
}
