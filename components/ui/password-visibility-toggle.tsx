"use client";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PasswordVisibilityToggleProps = {
  visible: boolean;
  onToggle: () => void;
  className?: string;
  labelVisible?: string;
  labelHidden?: string;
  iconSize?: number;
};

/** Tombol show/hide password di dalam field — icon-chip 44px. */
export function PasswordVisibilityToggle({
  visible,
  onToggle,
  className,
  labelVisible = "Tampilkan kata sandi",
  labelHidden = "Sembunyikan kata sandi",
  iconSize = 18,
}: PasswordVisibilityToggleProps) {
  return (
    <Button
      type="button"
      variant="icon-chip"
      size="icon-sm"
      className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2 text-[#1d1d1f]",
        className,
      )}
      onClick={onToggle}
      aria-label={visible ? labelHidden : labelVisible}
    >
      {visible ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
    </Button>
  );
}
