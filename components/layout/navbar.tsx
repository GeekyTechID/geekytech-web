"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SiteLogo } from "@/components/shared/site-logo";
import { NotificationBell } from "@/components/layout/notification-bell";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Produk", href: "/products" },
  { label: "Kategori", href: "/products?view=category" },
  { label: "Flash Sale", href: "/flash-sale" },
  { label: "Blog", href: "/blog" },
] as const;

// ----------------------------------------------------------------
// Navbar utama
// ----------------------------------------------------------------
export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isAuthenticated, isAdmin } = useAuth();
  const { reset } = useAuthStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [avatarImgError, setAvatarImgError] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tutup mobile menu saat route berubah
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Focus search input saat dibuka
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Lock scroll saat mobile menu terbuka
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      reset();
      toast.success("Berhasil keluar.");
    } catch {
      toast.error("Gagal keluar. Coba lagi.");
    } finally {
      window.location.href = "/";
    }
  };

  const userInitials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  const avatarUrl =
    profile?.avatar_url?.trim() ||
    (user?.user_metadata?.picture as string | undefined)?.trim() ||
    (user?.user_metadata?.avatar_url as string | undefined)?.trim() ||
    "";

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center gap-3">
            {/* Mobile: hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden -ml-1 p-2 text-muted-foreground hover:text-foreground transition-swiss"
              aria-label="Buka menu"
            >
              <Menu size={20} />
            </button>

            {/* Logo */}
            <SiteLogo variant="navbar" priority />

            {/* Desktop nav links */}
            <nav className="hidden lg:flex items-center gap-0.5 ml-4">
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium transition-swiss",
                    pathname === href || pathname.startsWith(href.split("?")[0])
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>

            <div className="flex-1" />

            {/* Desktop search bar */}
            {searchOpen ? (
              <form
                onSubmit={handleSearch}
                className="hidden lg:flex items-center border border-foreground/30 focus-within:border-foreground transition-swiss w-64"
              >
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari produk..."
                  className="flex-1 h-8 px-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="px-2 text-muted-foreground hover:text-foreground transition-swiss"
                  aria-label="Tutup pencarian"
                >
                  <X size={14} />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden lg:flex items-center gap-2 h-8 px-3 text-sm text-muted-foreground border border-border hover:border-foreground/30 hover:text-foreground transition-swiss w-52"
                aria-label="Cari produk"
              >
                <Search size={14} />
                <span>Cari produk...</span>
              </button>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Mobile search */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-swiss"
                aria-label="Cari"
              >
                <Search size={18} />
              </button>

              {/* Notif bell (hanya saat login) */}
              {isAuthenticated && <NotificationBell />}

              {/* Cart */}
              <Link
                href="/cart"
                className="relative inline-flex items-center justify-center rounded-full p-2 text-muted-foreground outline-none transition-colors hover:bg-black/[0.04] hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#FF7A52] focus-visible:ring-offset-2 dark:hover:bg-white/10"
                aria-label="Keranjang belanja"
              >
                <ShoppingCart size={18} />
              </Link>

              {/* Theme toggle */}
              <ThemeToggle className="hidden sm:flex" />

              {/* User menu / Auth buttons */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-1 h-8 gap-1.5 px-2"
                      aria-label="Menu akun"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden bg-foreground text-[10px] font-black text-background">
                        {avatarUrl && !avatarImgError ? (
                          <img
                            src={avatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={() => setAvatarImgError(true)}
                          />
                        ) : (
                          userInitials
                        )}
                      </div>
                      <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="font-normal">
                      <p className="truncate text-sm font-semibold">{profile?.full_name ?? "Pengguna"}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/profile" className="flex items-center gap-2">
                        <User size={14} />
                        Profil Saya
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/orders" className="flex items-center gap-2">
                        <Package size={14} />
                        Pesanan Saya
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="flex items-center gap-2">
                            <Settings size={14} />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      </>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => void handleLogout()}
                      className="gap-2"
                    >
                      <LogOut size={14} />
                      Keluar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden sm:flex items-center gap-1 ml-1">
                  <Link href="/login">
                    <Button variant="pearl" size="sm" className="text-xs font-bold uppercase">
                      Masuk
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="dark" size="sm" className="text-xs font-bold uppercase">
                      Daftar
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search bar (collapsible) */}
        {searchOpen && (
          <div className="lg:hidden border-t border-border px-4 py-2">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Search size={16} className="text-muted-foreground shrink-0" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk..."
                className="flex-1 h-8 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X size={16} />
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />

          {/* Drawer */}
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-background border-r border-border flex flex-col lg:hidden">
            {/* Header drawer */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-border shrink-0">
              <span className="font-black text-base uppercase">
                Menu
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
                aria-label="Tutup menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-0.5 px-3">
                {NAV_LINKS.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center h-10 px-3 text-sm font-medium transition-swiss",
                        pathname === href ||
                          pathname.startsWith(href.split("?")[0])
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted",
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="border-t border-border mx-3 my-4" />

              {/* Auth section */}
              {isAuthenticated ? (
                <div className="px-3 space-y-0.5">
                  <div className="px-3 py-2 mb-2">
                    <p className="text-sm font-semibold">
                      {profile?.full_name ?? "Pengguna"}
                    </p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <MobileMenuItem
                    icon={User}
                    label="Profil Saya"
                    href="/dashboard/profile"
                  />
                  <MobileMenuItem
                    icon={Package}
                    label="Pesanan Saya"
                    href="/dashboard/orders"
                  />
                  {isAdmin && (
                    <MobileMenuItem
                      icon={Settings}
                      label="Admin Panel"
                      href="/admin"
                    />
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 h-10 px-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-swiss"
                  >
                    <LogOut size={16} />
                    Keluar
                  </button>
                </div>
              ) : (
                <div className="px-3 space-y-2">
                  <Link href="/login" className="block">
                    <Button variant="pearl" className="w-full font-bold uppercase text-xs">
                      Masuk
                    </Button>
                  </Link>
                  <Link href="/register" className="block">
                    <Button variant="primary" className="w-full font-bold uppercase text-xs">
                      Daftar
                    </Button>
                  </Link>
                </div>
              )}
            </nav>

            {/* Theme toggle di drawer */}
            <div className="border-t border-border p-4 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  Tema
                </span>
                <ThemeToggle variant="full" />
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------
function MobileMenuItem({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 h-10 px-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-swiss"
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}
