"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Bell,
  Gift,
  Globe,
  Heart,
  Home,
  KeyRound,
  LogOut,
  MapPin,
  MessageCircle,
  Moon,
  Package,
  Settings,
  ShoppingCart,
  Sun,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth-store";
import {
  HEADER_DROPDOWN_MENU_CONTENT_CLASS,
  HEADER_DROPDOWN_MENU_ITEM_CLASS,
  HeaderDropdownPanelBody,
  HeaderDropdownPanelHeader,
} from "@/components/shared/header-dropdown-panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  external?: boolean;
};

const NAV_PRIMARY: NavItem[] = [
  { label: "Ringkasan", href: "/dashboard", icon: Home, exact: true },
  { label: "Pesanan", href: "/dashboard/orders", icon: Package },
  { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
  { label: "Notifikasi", href: "/dashboard/notifications", icon: Bell },
  { label: "Chat CS", href: "/dashboard/chat", icon: MessageCircle },
  { label: "Alamat", href: "/dashboard/addresses", icon: MapPin },
];

const NAV_SECONDARY: NavItem[] = [
  { label: "Profil", href: "/dashboard/profile", icon: User },
  { label: "Voucher", href: "/dashboard/vouchers", icon: Gift },
  { label: "Ganti Password", href: "/dashboard/change-password", icon: KeyRound },
];

const NAV_STORE: NavItem[] = [
  { label: "Ke Web GeekyTech", href: process.env.NEXT_PUBLIC_APP_URL ?? "/", icon: Globe, external: true },
  { label: "Keranjang", href: "/cart", icon: ShoppingCart },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? theme === "dark" : false;

  return (
    <SidebarMenu className="gap-1">
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setTheme(isDark ? "light" : "dark")}
          tooltip={isDark ? "Mode Terang" : "Mode Gelap"}
        >
          {isDark ? <Sun /> : <Moon />}
          <span>{isDark ? "Mode Terang" : "Mode Gelap"}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function NavUser() {
  const { profile, user } = useAuth();
  const { reset } = useAuthStore();
  const { isMobile } = useSidebar();
  const [imgError, setImgError] = React.useState(false);

  const displayName =
    profile?.full_name?.trim() || user?.email?.split("@")[0] || "Pengguna";
  const avatarUrl =
    profile?.avatar_url?.trim() ||
    (user?.user_metadata?.picture as string | undefined)?.trim() ||
    (user?.user_metadata?.avatar_url as string | undefined)?.trim() ||
    "";

  const initials = profile?.full_name
    ? profile.full_name
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? "?");

  React.useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      reset();
      toast.success("Berhasil keluar.");
    } catch {
      toast.error("Gagal keluar. Coba lagi.");
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <SidebarMenu className="gap-1">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip={displayName}
            >
              <Avatar className="size-8 rounded-lg shrink-0">
                {avatarUrl && !imgError ? (
                  <AvatarImage
                    src={avatarUrl}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                  />
                ) : null}
                <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {user?.email ?? ""}
                </span>
              </div>
              <Settings className="ml-auto size-4 shrink-0 text-sidebar-foreground/50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className={cn("w-56", HEADER_DROPDOWN_MENU_CONTENT_CLASS)}
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <HeaderDropdownPanelHeader title={displayName} />
            <HeaderDropdownPanelBody className="py-1">
              <DropdownMenuItem asChild className={HEADER_DROPDOWN_MENU_ITEM_CLASS}>
                <Link href="/dashboard/profile">
                  <User className="size-4" />
                  Profil saya
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={HEADER_DROPDOWN_MENU_ITEM_CLASS}>
                <Link href="/dashboard/notifications">
                  <Bell className="size-4" />
                  Notifikasi
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={HEADER_DROPDOWN_MENU_ITEM_CLASS}>
                <Link href="/dashboard/orders">
                  <Package className="size-4" />
                  Pesanan saya
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className={cn(
                  HEADER_DROPDOWN_MENU_ITEM_CLASS,
                  "border-t border-[#e0e0e0] text-destructive focus:bg-destructive/10 focus:text-destructive",
                )}
              >
                <LogOut className="size-4" />
                Keluar
              </DropdownMenuItem>
            </HeaderDropdownPanelBody>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function DashboardSidebar({
  unreadNotifications = 0,
  className,
  ...props
}: React.ComponentProps<typeof Sidebar> & { unreadNotifications?: number }) {
  const pathname = usePathname();

  const isActive = (href: string, exact = false) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar collapsible="icon" {...props} className={cn("border-[#e5e5e5] dark:border-[#2d2d2d]", className)}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" aria-label="GeekyTech — Dashboard">
                <Image
                  src="/logo.png"
                  alt="GeekyTech"
                  width={150}
                  height={150}
                  className="shrink-0 object-contain"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {NAV_PRIMARY.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;
              const badge =
                item.href === "/dashboard/notifications" && unreadNotifications > 0
                  ? unreadNotifications
                  : null;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild tooltip={item.label} isActive={active}>
                    <Link href={item.href} aria-current={active ? "page" : undefined}>
                      <Icon />
                      <span>{item.label}</span>
                      {badge !== null && (
                        <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground text-[10px] font-bold tabular-nums leading-none">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Pengaturan</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {NAV_SECONDARY.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild tooltip={item.label} isActive={active}>
                    <Link href={item.href} aria-current={active ? "page" : undefined}>
                      <Icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Lainnya</SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            {NAV_STORE.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <Link
                      href={item.href}
                      {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <ThemeToggle />
        <NavUser />
      </SidebarFooter>

    </Sidebar>
  );
}
