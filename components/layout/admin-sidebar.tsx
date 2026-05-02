"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronRight,
  FileBarChart,
  FileText,
  Grid2X2,
  ImageIcon,
  Layers,
  LogOut,
  MessageSquare,
  Package,
  Settings,
  ShoppingBag,
  Tag,
  Ticket,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import { useAuth } from "@/hooks/use-auth";
import { SiteLogo } from "@/components/shared/site-logo";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: BarChart3, exact: true },
    ],
  },
  {
    label: "Katalog",
    items: [
      { label: "Produk", href: "/admin/products", icon: Package },
      { label: "Kategori", href: "/admin/categories", icon: Grid2X2 },
      { label: "Tags", href: "/admin/tags", icon: Tag },
    ],
  },
  {
    label: "Transaksi",
    items: [
      { label: "Pesanan", href: "/admin/orders", icon: ShoppingBag },
      { label: "Pelanggan", href: "/admin/customers", icon: Users },
    ],
  },
  {
    label: "Konten",
    items: [
      { label: "Ulasan", href: "/admin/reviews", icon: MessageSquare },
      { label: "Komplain", href: "/admin/complaints", icon: FileText },
      { label: "Banner", href: "/admin/banners", icon: ImageIcon },
      { label: "Flash Sale", href: "/admin/flash-sale", icon: Zap },
      { label: "Kupon", href: "/admin/coupons", icon: Ticket },
    ],
  },
  {
    label: "Laporan & Stok",
    items: [
      { label: "Laporan", href: "/admin/reports", icon: FileBarChart },
      { label: "Stok", href: "/admin/stock", icon: Layers },
    ],
  },
  {
    label: "Sistem",
    items: [
      { label: "Pengaturan", href: "/admin/settings", icon: Settings },
    ],
  },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, user } = useAuth();
  const { reset } = useAuthStore();

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    toast.success("Berhasil keluar.");
    router.push("/admin/login");
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "A";

  return (
    <aside className="flex flex-col w-56 h-full bg-background border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-2.5 h-14 px-4 border-b border-border shrink-0">
        <div className="flex flex-col gap-1 min-w-0">
          <SiteLogo href="/admin" variant="adminSidebar" ariaLabel="GeekyTech Admin — Dashboard" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-1.5">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon, ...rest }) => {
                const exact = "exact" in rest ? rest.exact : false;
                const active = isActive(href, exact);

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 h-8 px-2 text-sm font-medium transition-swift rounded-none",
                        active
                          ? "bg-swiss-black text-swiss-white"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon
                        size={14}
                        className="shrink-0"
                        strokeWidth={active ? 2.5 : 1.5}
                      />
                      <span className="truncate">{label}</span>
                      {active && (
                        <ChevronRight
                          size={12}
                          className="ml-auto shrink-0 opacity-60"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-border p-3 shrink-0 space-y-1">
        <Link
          href="/admin/settings/account"
          className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-muted transition-swiss rounded-none group"
        >
          <div className="w-6 h-6 bg-foreground text-background text-[10px] font-black flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate">
              {profile?.full_name ?? "Admin"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 h-8 px-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-swiss"
        >
          <LogOut size={13} />
          Keluar
        </button>
      </div>
    </aside>
  );
}
