"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ExternalLink,
  LogOut,
  Menu,
  Settings,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────
   Page title mapping berdasarkan pathname
   ────────────────────────────────────────────────────────────── */
const PAGE_TITLES: { pattern: RegExp; title: string }[] = [
  { pattern: /^\/admin$/, title: "Dashboard" },
  { pattern: /^\/admin\/products\/new$/, title: "Tambah Produk" },
  { pattern: /^\/admin\/products\/[^/]+\/edit$/, title: "Edit Produk" },
  { pattern: /^\/admin\/products/, title: "Kelola Produk" },
  { pattern: /^\/admin\/brands\/new$/, title: "Tambah Merek" },
  { pattern: /^\/admin\/brands\/[^/]+\/edit$/, title: "Edit Merek" },
  { pattern: /^\/admin\/brands/, title: "Kelola Merek" },
  { pattern: /^\/admin\/categories/, title: "Kelola Kategori" },
  { pattern: /^\/admin\/tags/, title: "Tags" },
  { pattern: /^\/admin\/orders\/[^/]+$/, title: "Detail Pesanan" },
  { pattern: /^\/admin\/orders/, title: "Kelola Pesanan" },
  { pattern: /^\/admin\/customers\/[^/]+$/, title: "Detail Pelanggan" },
  { pattern: /^\/admin\/customers/, title: "Kelola Pelanggan" },
  { pattern: /^\/admin\/reviews/, title: "Ulasan" },
  { pattern: /^\/admin\/complaints/, title: "Komplain" },
  { pattern: /^\/admin\/banners/, title: "Banner" },
  { pattern: /^\/admin\/flash-sale/, title: "Flash Sale" },
  { pattern: /^\/admin\/settings/, title: "Pengaturan" },
];

function getPageTitle(pathname: string): string {
  for (const { pattern, title } of PAGE_TITLES) {
    if (pattern.test(pathname)) return title;
  }
  return "Admin Panel";
}

/* ──────────────────────────────────────────────────────────────
   AdminTopbar
   ────────────────────────────────────────────────────────────── */
type AdminTopbarProps = {
  onMenuClick: () => void;
};

export function AdminTopbar({ onMenuClick }: AdminTopbarProps) {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const { reset } = useAuthStore();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    : user?.email?.[0]?.toUpperCase() ?? "A";

  return (
    <header className="admin-topbar-surface sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 px-4 lg:px-6">
      {/* Hamburger — tampil di mobile */}
      <button
        onClick={onMenuClick}
        className="md:hidden -ml-1 p-2 text-muted-foreground hover:text-foreground transition-swiss"
        aria-label="Buka menu navigasi"
      >
        <Menu size={20} />
      </button>

      {/* Judul halaman — memakai ruang antara menu & aksi */}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold uppercase text-foreground sm:text-[21px]">
          {pageTitle}
        </h1>
      </div>

      {/* Actions kanan */}
      <div className="flex items-center gap-1">
        {/* Link ke website publik */}
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-text-link hidden h-11 items-center gap-1 rounded-full border border-transparent px-4 sm:flex dark:hover:border-border"
          aria-label="Buka website"
        >
          <ExternalLink size={13} />
          <span className="hidden lg:inline font-medium">Website</span>
        </Link>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notification bell (placeholder) */}
        <button
          className="relative p-2 text-muted-foreground hover:text-foreground transition-swiss"
          aria-label="Notifikasi"
        >
          <Bell size={18} />
        </button>

        {/* User avatar + dropdown */}
        <div ref={userMenuRef} className="relative ml-1">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex h-11 items-center gap-1.5 rounded-md border border-transparent px-3 transition-colors hover:border-[#e0e0e0] hover:bg-muted/60 dark:hover:border-border"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            aria-label="Menu akun"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-black text-foreground">
              {initials}
            </div>
            <div className="hidden lg:block text-left min-w-0 max-w-[8rem]">
              <p className="text-xs font-semibold leading-none truncate">
                {profile?.full_name ?? "Admin"}
              </p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5 truncate">
                {user?.email}
              </p>
            </div>
            <ChevronDown
              size={12}
              className={cn(
                "text-muted-foreground transition-transform duration-150 hidden lg:block",
                userMenuOpen && "rotate-180",
              )}
            />
          </button>

          {userMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-[#e0e0e0] bg-card py-1 dark:border-border"
            >
              {/* Info user */}
              <div className="border-b border-[#e0e0e0] px-3 py-2.5 dark:border-border">
                <p className="text-sm font-semibold truncate">
                  {profile?.full_name ?? "Admin"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>

              <TopbarMenuItem
                icon={User}
                label="Profil Saya"
                href="/admin/settings/account"
              />
              <TopbarMenuItem
                icon={Settings}
                label="Pengaturan"
                href="/admin/settings"
              />
              <TopbarMenuItem
                icon={ExternalLink}
                label="Lihat Website"
                href="/"
                external
              />

              <div className="border-t border-border my-1" />

              <button
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-swiss"
              >
                <LogOut size={14} />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────
   Helper
   ────────────────────────────────────────────────────────────── */
function TopbarMenuItem({
  icon: Icon,
  label,
  href,
  external = false,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  external?: boolean;
}) {
  return (
    <Link
      role="menuitem"
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="mx-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted"
    >
      <Icon size={14} className="text-muted-foreground" />
      {label}
    </Link>
  );
}
