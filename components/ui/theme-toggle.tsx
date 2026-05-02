"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ThemeToggleProps = {
  className?: string;
  variant?: "icon" | "full";
};

const THEMES = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
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
        variant="ghost"
        size="icon"
        className={cn("size-8 rounded-none", className)}
        aria-label="Ganti tema"
      >
        <span className="size-4" />
      </Button>
    );
  }

  const currentTheme = THEMES.find((t) => t.value === theme) ?? THEMES[0];
  const Icon = currentTheme.icon;

  const cycleTheme = () => {
    const currentIndex = THEMES.findIndex((t) => t.value === theme);
    const next = THEMES[(currentIndex + 1) % THEMES.length];
    setTheme(next.value);
  };

  if (variant === "full") {
    return (
      <div
        className={cn(
          "inline-flex border border-border rounded-none overflow-hidden",
          className,
        )}
        role="group"
        aria-label="Pilih tema"
      >
        {THEMES.map(({ value, label, icon: ThemeIcon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-swiss",
              "border-r border-border last:border-r-0",
              theme === value
                ? "bg-swiss-black text-swiss-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
            aria-label={label}
            aria-pressed={theme === value}
          >
            <ThemeIcon size={12} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className={cn("size-8 rounded-none", className)}
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
