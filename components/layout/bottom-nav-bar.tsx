"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2X2, Home, ShoppingCart, User } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/products", label: "Produk", icon: Grid2X2 },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/dashboard", label: "Akun", icon: User, authHref: "/login" },
] as const;

export function BottomNavBar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background border-t border-border"
      aria-label="Navigasi bawah"
    >
      <ul className="grid grid-cols-4 h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon, ...rest }) => {
          const resolvedHref =
            "authHref" in rest && !isAuthenticated ? rest.authHref : href;
          const active = isActive(href);

          return (
            <li key={href}>
              <Link
                href={resolvedHref}
                className={cn(
                  "flex flex-col items-center justify-center h-full gap-1 transition-swiss",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.5}
                  className={active ? "text-brand" : ""}
                />
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    active && "text-brand",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
