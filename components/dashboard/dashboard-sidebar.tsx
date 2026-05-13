"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Gift,
  Heart,
  Home,
  KeyRound,
  LogOut,
  MapPin,
  Package,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { SiteLogo } from "@/components/shared/site-logo";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: typeof Home; exact?: boolean };

const NAV_ITEMS: NavItem[] = [
  { label: "Ringkasan", href: "/dashboard", icon: Home, exact: true },
  { label: "Pesanan", href: "/dashboard/orders", icon: Package },
  { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
  { label: "Profil", href: "/dashboard/profile", icon: User },
  { label: "Alamat", href: "/dashboard/addresses", icon: MapPin },
  { label: "Notifikasi", href: "/dashboard/notifications", icon: Bell },
  { label: "Voucher", href: "/dashboard/vouchers", icon: Gift },
  { label: "Ganti password", href: "/dashboard/change-password", icon: KeyRound },
];

export function DashboardSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("Berhasil keluar.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Gagal keluar.");
    }
  };

  return (
    <aside className="flex h-full w-[min(100%,17rem)] flex-col border-r border-[#e0e0e0] bg-white">
      <div className="border-b border-[#e0e0e0] px-5 py-4">
        <Link href="/" className="block" onClick={onNavigate}>
          <SiteLogo asStatic variant="adminSidebar" className="h-8 w-auto" />
        </Link>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a7a7a]">Akun</p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Menu dashboard">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-black text-white" : "text-[#1d1d1f] hover:bg-[#f5f5f7]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[#e0e0e0] p-3">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
          Keluar
        </button>
      </div>
    </aside>
  );
}
