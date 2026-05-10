"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Dasar tombol/link aksi baris tabel admin — tipografi caption, radius utilitas 8px (design: rounded-sm). */
export const adminTableRowActionBaseClass =
  "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-sm border px-3 text-sm font-normal leading-snug tracking-[-0.224px] transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export function AdminTableEditLink({
  className,
  children = "Edit",
  ...props
}: ComponentProps<typeof Link> & { children?: ReactNode }) {
  return (
    <Link
      className={cn(
        adminTableRowActionBaseClass,
        "border-brand/40 text-brand hover:bg-brand/5",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export function AdminTableDetailLink({
  className,
  children = "Detail",
  ...props
}: ComponentProps<typeof Link> & { children?: ReactNode }) {
  return (
    <Link
      className={cn(
        adminTableRowActionBaseClass,
        "border-[#e0e0e0] text-foreground hover:bg-muted dark:border-border",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export function AdminTableDeleteButton({
  className,
  children = "Hapus",
  ...props
}: ComponentProps<"button"> & { children?: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        adminTableRowActionBaseClass,
        "border-destructive/40 text-destructive hover:bg-destructive/10",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

type RowTone = "brand" | "danger" | "neutral" | "positive";

const rowToneClass: Record<RowTone, string> = {
  brand: "border-brand/40 text-brand hover:bg-brand/5",
  danger: "border-destructive/40 text-destructive hover:bg-destructive/10",
  neutral: "border-[#e0e0e0] text-foreground hover:bg-muted dark:border-border",
  positive:
    "border-emerald-600/35 text-emerald-800 hover:bg-emerald-500/10 dark:border-emerald-700/40 dark:text-emerald-400",
};

export function AdminTableRowTextButton({
  tone,
  className,
  ...props
}: ComponentProps<"button"> & { tone: RowTone }) {
  return (
    <button
      type="button"
      className={cn(adminTableRowActionBaseClass, rowToneClass[tone], className)}
      {...props}
    />
  );
}
