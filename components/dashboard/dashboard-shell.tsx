"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { Button } from "@/components/ui/button";

type DashboardShellProps = {
  children: React.ReactNode;
  unreadNotifications?: number;
};

export function DashboardShell({ children, unreadNotifications = 0 }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col text-[#1d1d1f]">
      <div className="flex w-full min-h-0 min-w-0 flex-1 flex-col pt-4 sm:pt-6 lg:pt-8">
        {/* Sidebar kolom dari lg+; tablet (md–lg) pakai drawer agar konten tidak terlalu sempit */}
        <div className="mx-auto flex w-full max-w-[1400px] min-h-0 min-w-0 flex-1 flex-col px-4 sm:px-6 lg:px-8 lg:flex-row lg:gap-6 xl:gap-8">
          <div data-no-print className="hidden w-[min(100%,18rem)] shrink-0 lg:flex lg:self-start lg:sticky lg:top-28 xl:w-[min(100%,19rem)]">
            <DashboardSidebar className="w-full" unreadNotifications={unreadNotifications} />
          </div>

          <div data-no-print>
          {mobileOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
                aria-label="Tutup menu"
                onClick={() => setMobileOpen(false)}
              />
              <div
                className="fixed inset-y-0 left-0 z-50 flex w-[min(92vw,20rem)] max-w-[20rem] flex-col border-r border-[#e8e4dc] bg-gradient-to-b from-[#faf8f4] to-[#f5f0eb] shadow-2xl lg:hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Menu akun"
              >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#e8e4dc] px-3 py-2.5 pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
                  <span className="text-[11px] font-bold uppercase text-[#7a7a7a]">Menu akun</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Tutup menu"
                    onClick={() => setMobileOpen(false)}
                  >
                    <X className="h-5 w-5" strokeWidth={2} />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <DashboardSidebar
                    className="h-full min-h-0"
                    unreadNotifications={unreadNotifications}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </div>
              </div>
            </>
          ) : null}
          </div>

          <div className="flex w-full min-w-0 flex-1 flex-col bg-white">
            <header data-no-print className="flex w-full shrink-0 items-center gap-3 border-b border-[#f0f0f0] bg-white px-3 py-2.5 sm:px-4 sm:py-3 lg:hidden">
              <Button
                type="button"
                variant="pearl"
                size="icon-sm"
                className="shrink-0 sm:size-9"
                aria-label="Buka menu akun"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" strokeWidth={2} />
              </Button>
              <span className="min-w-0 truncate text-[12px] font-semibold uppercase text-[#1d1d1f] sm:text-[13px]">
                Dashboard
              </span>
            </header>
            <main className="flex w-full min-h-0 flex-1 flex-col">
              <div className="mx-auto w-full max-w-4xl flex-1 px-4 pb-10 pt-3 sm:px-5 md:px-6 xl:max-w-5xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
