"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
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
      { label: "Merek", href: "/admin/brands", icon: Building2 },
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
  const { profile, user } = useAuth();
  const { reset } = useAuthStore();

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      reset();
      toast.success("Berhasil keluar.");
    } catch {
      toast.error("Gagal keluar. Coba lagi.");
    } finally {
      window.location.href = "/admin/login";
    }
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
    <aside className="admin-sidebar-surface sticky top-0 shrink-0">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-[#e0e0e0] px-4 dark:border-border">
        <div className="flex flex-col gap-1 min-w-0">
          <SiteLogo href="/admin" variant="adminSidebar" ariaLabel="GeekyTech Admin — Dashboard" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                        "flex h-11 items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors active:scale-[0.98]",
                        active
                          ? "bg-brand/10 font-semibold text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon
                        size={14}
                        className={cn("shrink-0", active && "text-brand")}
                        strokeWidth={active ? 2.5 : 1.5}
                      />
                      <span className="truncate">{label}</span>
                      {active && (
                        <ChevronRight
                          size={12}
                          className="ml-auto shrink-0 text-brand/70"
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
      <div className="shrink-0 space-y-1 border-t border-[#e0e0e0] p-3 dark:border-border">
        <Link
          href="/admin/settings/account"
          className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-black text-foreground">
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
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-full items-center gap-2.5 rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive active:scale-[0.98]"
        >
          <LogOut size={13} />
          Keluar
        </button>
      </div>
    </aside>
  );
}
