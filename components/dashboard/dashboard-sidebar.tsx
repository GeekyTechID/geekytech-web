"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Gift,
  Heart,
  Home,
  KeyRound,
  MapPin,
  Package,
  User,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: typeof Home; exact?: boolean };

const NAV_PRIMARY: NavItem[] = [
  { label: "Ringkasan", href: "/dashboard", icon: Home, exact: true },
  { label: "Pesanan", href: "/dashboard/orders", icon: Package },
  { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
  { label: "Notifikasi", href: "/dashboard/notifications", icon: Bell },
  { label: "Alamat", href: "/dashboard/addresses", icon: MapPin },
];

const NAV_SECONDARY: NavItem[] = [
  { label: "Profil", href: "/dashboard/profile", icon: User },
  { label: "Voucher", href: "/dashboard/vouchers", icon: Gift },
  { label: "Ganti password", href: "/dashboard/change-password", icon: KeyRound },
];

function NavLink({
  item,
  pathname,
  onNavigate,
  unreadOverride,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  unreadOverride?: number;
}) {
  const active = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const badge =
    item.href === "/dashboard/notifications" && unreadOverride !== undefined && unreadOverride > 0
      ? unreadOverride
      : undefined;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "relative flex w-full min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium leading-snug transition",
        active
          ? "bg-gradient-to-r from-transparant to-[#EA5329]/25 text-[#1d1d1f]"
          : "text-[#333333] hover:bg-white/50",
      )}
    >
      {active ? (
        <span
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-[#EA5329]"
          aria-hidden
        />
      ) : null}
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[#1d1d1f]" : "text-[#7a7a7a]")} strokeWidth={2} />
      <span className={cn("flex-1 text-left", active && "font-semibold")}>{item.label}</span>
      {badge !== undefined && badge > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e8e8ed] px-1.5 text-[10px] font-bold tabular-nums text-[#1d1d1f]">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

export function DashboardSidebar({
  onNavigate,
  className,
  unreadNotifications = 0,
}: {
  onNavigate?: () => void;
  className?: string;
  unreadNotifications?: number;
}) {
  const pathname = usePathname();
  const [imgError, setImgError] = useState(false);
  const { profile, user } = useAuth();

  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "Pengguna";
  const avatarUrl =
    profile?.avatar_url?.trim() ||
    (user?.user_metadata?.picture as string | undefined)?.trim() ||
    (user?.user_metadata?.avatar_url as string | undefined)?.trim() ||
    "";

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const initials = profile?.full_name
    ? profile.full_name
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <aside
      className={cn(
        "flex h-auto w-full flex-col bg-gradient-to-r from-transparent to-[#f5f0eb]",
        className,
      )}
    >
      <div className="mx-2 mt-2 flex min-w-0 items-center gap-3 rounded-2xl px-2 py-3 sm:mx-3 sm:mt-3 sm:px-3">
        <span className="relative flex h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#1d1d1f] sm:h-12 sm:w-12">
          {avatarUrl && !imgError ? (
            <img
              key={avatarUrl}
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[13px] font-semibold text-white">
              {initials}
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight text-[#1d1d1f]">
            {displayName}
          </p>
          {user?.email ? (
            <p className="mt-0.5 truncate text-[11px] leading-snug text-[#7a7a7a]">{user.email}</p>
          ) : null}
        </div>
      </div>

      <nav
        className="mt-4 w-full flex-1 space-y-0.5 overflow-y-auto overscroll-y-contain px-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:mt-5 sm:space-y-1 sm:px-3 sm:pb-3"
        aria-label="Menu dashboard"
      >
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase text-[#7a7a7a]">Menu</p>
        {NAV_PRIMARY.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
            unreadOverride={unreadNotifications}
          />
        ))}
        <div className="my-3 border-t border-[#e8e4df]" />
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase text-[#7a7a7a]">
          Pengaturan
        </p>
        {NAV_SECONDARY.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>
    </aside>
  );
}
