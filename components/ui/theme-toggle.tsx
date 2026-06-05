"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";

type ThemeToggleProps = {
  className?: string;
  variant?: "icon" | "full";
};

const THEMES = [
  { value: "light" as const, label: "Terang", icon: Sun },
  { value: "dark" as const, label: "Gelap", icon: Moon },
  { value: "system" as const, label: "Sistem", icon: Monitor },
] as const;

/**
 * ThemeToggle — siklus light → dark → system.
 * variant="icon" untuk navbar, variant="full" untuk settings.
 */
export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        variant="icon-chip"
        size="icon-sm"
        className={className}
        aria-label="Ganti tema"
      >
        <span className="size-4" />
      </Button>
    );
  }

  const currentTheme = THEMES.find((t) => t.value === theme) ?? THEMES[0];

  const cycleTheme = () => {
    const currentIndex = THEMES.findIndex((t) => t.value === theme);
    const next = THEMES[(currentIndex + 1) % THEMES.length];
    setTheme(next.value);
  };

  if (variant === "full") {
    return (
      <SegmentedControl
        value={(theme ?? "light") as "light" | "dark" | "system"}
        onChange={setTheme}
        aria-label="Pilih tema"
        className={className}
        options={THEMES.map(({ value, label, icon: ThemeIcon }) => ({
          value,
          label: (
            <>
              <ThemeIcon size={12} />
              <span className="hidden sm:inline">{label}</span>
            </>
          ),
        }))}
      />
    );
  }

  return (
    <Button
      variant="icon-chip"
      size="icon-sm"
      onClick={cycleTheme}
      className={className}
      aria-label={`Tema sekarang: ${currentTheme.label}. Klik untuk ganti.`}
      title={`Tema: ${currentTheme.label}`}
    >
      {resolvedTheme === "dark" ? (
        <Moon size={16} />
      ) : (
        <Sun size={16} />
      )}
    </Button>
  );
}
