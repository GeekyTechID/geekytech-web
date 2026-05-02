"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

import { createClient } from "@/lib/supabase/client";
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
  const router = useRouter();
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
    : user?.email?.[0]?.toUpperCase() ?? "A";

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
      {/* Hamburger — tampil di mobile */}
      <button
        onClick={onMenuClick}
        className="md:hidden -ml-1 p-2 text-muted-foreground hover:text-foreground transition-swiss"
        aria-label="Buka menu navigasi"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-sm font-black uppercase tracking-wide truncate">
          {pageTitle}
        </h1>
      </div>

      <div className="flex-1" />

      {/* Actions kanan */}
      <div className="flex items-center gap-1">
        {/* Link ke website publik */}
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1 h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-swiss"
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
            className="flex items-center gap-1.5 h-8 px-2 border border-transparent hover:border-border transition-swiss"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            aria-label="Menu akun"
          >
            <div className="w-6 h-6 bg-foreground text-background text-[10px] font-black flex items-center justify-center shrink-0">
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
              className="absolute right-0 top-full mt-1 w-52 bg-background border border-border z-50 py-1 shadow-sm"
            >
              {/* Info user */}
              <div className="px-3 py-2.5 border-b border-border">
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
      className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-swiss"
    >
      <Icon size={14} className="text-muted-foreground" />
      {label}
    </Link>
  );
}
