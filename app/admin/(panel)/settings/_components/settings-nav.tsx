"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Umum", href: "/admin/settings" },
  { label: "Pengiriman", href: "/admin/settings/shipping" },
  { label: "Pembayaran", href: "/admin/settings/payment" },
  { label: "FAQ", href: "/admin/settings/faq" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin/settings") {
      return pathname === "/admin/settings";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex gap-0 border-b border-border">
      {TABS.map(({ label, href }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "h-10 px-4 flex items-center text-xs font-bold uppercase tracking-widest border-b-2 transition-colors",
            isActive(href)
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
