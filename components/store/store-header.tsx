"use client";

import { useEffect, useRef, useState, startTransition } from "react";
import Image from "next/image";
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

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StoreHeaderCategory = { id: string; name: string; slug: string };

type StoreHeaderProps = {
  categories: StoreHeaderCategory[];
};

export function StoreHeader({ categories }: StoreHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isAuthenticated, isAdmin } = useAuth();
  const { reset } = useAuthStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setSearchQuery("");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    toast.success("Berhasil keluar.");
    router.push("/");
    router.refresh();
  };

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
              onSubmit={handleSearch}
              className="mx-auto hidden min-w-0 max-w-2xl flex-1 items-center md:flex"
            >
              <div className="flex w-full items-center rounded-full border border-neutral-200 bg-neutral-100 pl-4 dark:border-border dark:bg-muted">
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari..."
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-500 dark:text-foreground dark:placeholder:text-muted-foreground"
                  aria-label="Cari produk"
                />
                <button
                  type="submit"
                  className="m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white transition hover:bg-neutral-800 dark:bg-foreground dark:text-background"
                  aria-label="Cari"
                >
                  <Search size={16} strokeWidth={2.5} />
                </button>
              </div>
            </form>

            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
              <Link
                href="/cart"
                className="hidden p-2 text-neutral-600 hover:text-black sm:block dark:text-muted-foreground dark:hover:text-foreground"
                aria-label="Keranjang"
              >
                <ShoppingCart size={20} />
              </Link>
              <ThemeToggle className="hidden sm:flex" />

              {isAuthenticated ? (
                <div ref={userMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex h-9 items-center gap-1.5 rounded-md border border-neutral-200 px-2 text-sm font-medium dark:border-border"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="menu"
                  >
                    <span className="flex h-6 w-6 items-center justify-center bg-black text-[10px] font-black text-white dark:bg-foreground dark:text-background">
                      {userInitials}
                    </span>
                    <ChevronDown size={12} className={cn("text-neutral-500", userMenuOpen && "rotate-180")} />
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
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <LogOut size={14} />
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
          <form onSubmit={handleSearch} className="pb-3 md:hidden">
            <div className="flex w-full items-center rounded-full border border-neutral-200 bg-neutral-100 pl-3 dark:border-border dark:bg-muted">
              <Search size={16} className="shrink-0 text-neutral-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari..."
                className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-neutral-500"
              />
              <button
                type="submit"
                className="m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white"
                aria-label="Cari"
              >
                <Search size={14} />
              </button>
            </div>
          </form>

          {/* Kategori */}
          <nav
            aria-label="Kategori produk"
            className="scrollbar-none flex gap-4 overflow-x-auto py-3 text-sm font-medium text-black dark:border-border dark:text-foreground"
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
                  <HeaderMenuLink icon={User} label="Profil" href="/dashboard/profile" />
                  <HeaderMenuLink icon={Package} label="Pesanan" href="/dashboard/orders" />
                  {isAdmin && <HeaderMenuLink icon={Settings} label="Admin" href="/admin" />}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 py-2 text-sm text-red-600"
                  >
                    <LogOut size={16} />
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
