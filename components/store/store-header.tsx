"use client";

import { useCallback, useEffect, useRef, useState, startTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type SearchResult = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
  image: string | null;
};
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/supabase";

export type StoreHeaderCategory = { id: string; name: string; slug: string };

/** URL avatar: profil DB dulu, lalu metadata OAuth (picture). */
function resolveStoreHeaderAvatarUrl(
  profile: Tables<"profiles"> | null,
  user: SupabaseUser | null,
): string {
  const fromProfile = profile?.avatar_url?.trim();
  if (fromProfile) return fromProfile;
  const meta = user?.user_metadata;
  if (!meta || typeof meta !== "object") return "";
  const picture = meta.picture;
  if (typeof picture === "string" && picture.trim() !== "") return picture.trim();
  const metaAvatar = meta.avatar_url;
  if (typeof metaAvatar === "string" && metaAvatar.trim() !== "") return metaAvatar.trim();
  return "";
}

type StoreHeaderProps = {
  categories: StoreHeaderCategory[];
  initialCartCount?: number;
};

export function StoreHeader({ categories, initialCartCount = 0 }: StoreHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isAuthenticated, isAdmin } = useAuth();
  const { reset } = useAuthStore();
  const cartCount = useCartStore((s) => s.cartCount);
  const setCartCount = useCartStore((s) => s.setCartCount);

  useEffect(() => {
    setCartCount(initialCartCount);
  }, [initialCartCount, setCartCount]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    startTransition(() => {
      setMobileMenuOpen(false);
    });
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const fetchSearchResults = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setSearchResults(data.results ?? []);
      setShowDropdown(true);
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => fetchSearchResults(value), 300);
    },
    [fetchSearchResults],
  );

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setShowDropdown(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setShowDropdown(false);
  };

  const closeDropdown = () => setTimeout(() => setShowDropdown(false), 150);

  const searchDropdown = showDropdown && searchResults.length > 0 ? (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-border dark:bg-background">
      {searchResults.map((r) => (
        <Link
          key={r.id}
          href={`/products/${r.slug}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setShowDropdown(false); setSearchQuery(""); setSearchResults([]); }}
          className="flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-muted"
        >
          {r.image ? (
            <Image src={r.image} alt={r.name} width={40} height={40} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-lg bg-neutral-100 dark:bg-muted" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-foreground">{r.name}</p>
            <p className="text-xs text-neutral-500">
              {r.sale_price
                ? `Rp${r.sale_price.toLocaleString("id-ID")}`
                : `Rp${r.base_price.toLocaleString("id-ID")}`}
            </p>
          </div>
        </Link>
      ))}
      <Link
        href={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { setShowDropdown(false); setSearchQuery(""); setSearchResults([]); }}
        className="flex items-center justify-center border-t border-neutral-100 px-3 py-2 text-xs font-medium text-[#EA5329] hover:bg-neutral-50 dark:border-border dark:hover:bg-muted"
      >
        Lihat semua hasil untuk &ldquo;{searchQuery.trim()}&rdquo; →
      </Link>
    </div>
  ) : null;

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      reset();
      toast.success("Berhasil keluar.");
    } catch {
      toast.error("Gagal keluar. Coba lagi.");
    } finally {
      setIsLoggingOut(false);
      window.location.href = "/";
    }
  };

  const avatarUrl = resolveStoreHeaderAvatarUrl(profile, user);

  const userInitials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white dark:border-border dark:bg-background">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          {/* Baris atas */}
          <div className="flex items-center gap-3 py-3 md:py-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="shrink-0 p-2 text-neutral-600 md:hidden dark:text-muted-foreground"
              aria-label="Buka menu"
            >
              <Menu size={22} />
            </button>

            <Link href="/" className="relative block h-8 w-[9.5rem] shrink-0 sm:h-9 sm:w-[11.5rem]" aria-label="GeekyTech — Beranda">
              <Image
                src="/logo.png"
                alt="GeekyTech"
                fill
                className="object-contain object-left"
                sizes="184px"
                priority
              />
            </Link>

            <form
              onSubmit={handleSearchSubmit}
              className="relative mx-auto hidden min-w-0 max-w-2xl flex-1 sm:block"
            >
              <div className="flex w-full items-center rounded-full border border-neutral-200 bg-neutral-100 pl-4 pr-3 dark:border-border dark:bg-muted">
                <Search size={14} className="mr-2 shrink-0 text-neutral-400" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                  onBlur={closeDropdown}
                  placeholder="Cari produk..."
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-500 dark:text-foreground dark:placeholder:text-muted-foreground"
                  aria-label="Cari produk"
                  aria-expanded={showDropdown}
                  aria-autocomplete="list"
                />
                {isSearching && <Loader2 size={14} className="shrink-0 animate-spin text-neutral-400" />}
              </div>
              {searchDropdown}
            </form>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
              <Link
                href="/cart"
                className="relative hidden p-2 text-neutral-600 hover:text-black sm:block dark:text-muted-foreground dark:hover:text-foreground"
                aria-label={`Keranjang${cartCount > 0 ? ` (${cartCount})` : ""}`}
              >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EA5329] px-1 text-[10px] font-bold leading-none text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>
              <ThemeToggle className="hidden sm:flex" />

              {isAuthenticated ? (
                <div ref={userMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium dark:border-border"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="menu"
                    aria-label="Menu akun"
                  >
                    <span className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-black dark:bg-foreground">
                      {avatarUrl ? (
                        <img
                          key={avatarUrl}
                          src={avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-black text-white dark:text-background">
                          {userInitials}
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      size={12}
                      className={cn(
                        "shrink-0 text-muted-foreground transition-transform duration-150",
                        userMenuOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {userMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-50 mt-1 w-52 border border-neutral-200 bg-white py-1 shadow-lg dark:border-border dark:bg-background"
                    >
                      <div className="border-b border-neutral-100 px-3 py-2 dark:border-border">
                        <p className="truncate text-sm font-semibold">{profile?.full_name ?? "Pengguna"}</p>
                        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                      <HeaderMenuLink icon={LayoutDashboard} label="Dashboard" href="/dashboard" />
                      <HeaderMenuLink icon={User} label="Profil" href="/dashboard/profile" />
                      <HeaderMenuLink icon={Package} label="Pesanan" href="/dashboard/orders" />
                      {isAdmin && (
                        <HeaderMenuLink icon={Settings} label="Admin" href="/admin" />
                      )}
                      <div className="my-1 border-t border-neutral-100 dark:border-border" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
                      >
                        {isLoggingOut ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <LogOut size={14} />
                        )}
                        Keluar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Link
                    href="/login"
                    className="hidden items-center gap-1.5 px-2 text-sm font-semibold text-neutral-800 sm:flex dark:text-foreground"
                  >
                    <User size={16} strokeWidth={1.75} />
                    Masuk
                  </Link>
                  <Button
                    asChild
                    className="h-9 rounded-none border-0 bg-brand px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-brand/90"
                  >
                    <Link href="/register">Daftar</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Pencarian mobile */}
          <form onSubmit={handleSearchSubmit} className="relative pb-3 sm:hidden">
            <div className="flex w-full items-center rounded-full border border-neutral-200 bg-neutral-100 pl-3 pr-3 dark:border-border dark:bg-muted">
              <Search size={15} className="shrink-0 text-neutral-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                onBlur={closeDropdown}
                placeholder="Cari produk..."
                className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-neutral-500"
                aria-label="Cari produk"
              />
              {isSearching && <Loader2 size={13} className="shrink-0 animate-spin text-neutral-400" />}
            </div>
            {searchDropdown}
          </form>

          {/* Kategori */}
          <nav
            aria-label="Kategori produk"
            className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto scroll-py-2 px-4 py-3 text-sm font-medium text-black sm:-mx-6 sm:px-6 dark:border-border dark:text-foreground"
          >
            {categories.length === 0 ? (
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Kategori segera hadir</span>
            ) : (
              categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/products?category=${encodeURIComponent(c.slug)}`}
                  className="shrink-0 whitespace-nowrap transition hover:text-brand"
                >
                  {c.name}
                </Link>
              ))
            )}
          </nav>
        </div>
      </header>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <aside className="fixed left-0 top-0 z-[60] flex h-full w-[min(100%,20rem)] flex-col border-r border-neutral-200 bg-white dark:border-border dark:bg-background md:hidden">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-border">
              <span className="text-sm font-black uppercase tracking-widest">Menu</span>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-2" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Kategori</p>
              <ul className="space-y-0.5">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/products?category=${encodeURIComponent(c.slug)}`}
                      className="flex h-10 items-center px-2 text-sm font-medium"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="my-4 border-t border-neutral-100 dark:border-border" />
              {!isAuthenticated ? (
                <div className="space-y-2 px-2">
                  <Button asChild variant="outline" className="w-full rounded-none font-bold uppercase">
                    <Link href="/login">Masuk</Link>
                  </Button>
                  <Button asChild className="w-full rounded-none bg-brand font-bold uppercase text-white hover:bg-brand/90">
                    <Link href="/register">Daftar</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-1 px-2">
                  <HeaderMenuLink icon={LayoutDashboard} label="Dashboard" href="/dashboard" />
                  <HeaderMenuLink icon={User} label="Profil" href="/dashboard/profile" />
                  <HeaderMenuLink icon={Package} label="Pesanan" href="/dashboard/orders" />
                  {isAdmin && <HeaderMenuLink icon={Settings} label="Admin" href="/admin" />}
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-2 py-2 text-sm text-red-600 disabled:opacity-50"
                  >
                    {isLoggingOut ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <LogOut size={16} />
                    )}
                    Keluar
                  </button>
                </div>
              )}
            </nav>
            <div className="border-t border-neutral-100 p-4 dark:border-border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tema</span>
                <ThemeToggle variant="full" />
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

function HeaderMenuLink({
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
      role="menuitem"
      href={href}
      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-muted"
    >
      <Icon size={14} className="text-muted-foreground" />
      {label}
    </Link>
  );
}
