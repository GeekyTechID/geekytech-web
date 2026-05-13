"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { StoreHeader, type StoreHeaderCategory } from "@/components/store/store-header";
import { Button } from "@/components/ui/button";

type DashboardShellProps = {
  children: React.ReactNode;
  categories: StoreHeaderCategory[];
  initialCartCount?: number;
  unreadNotifications?: number;
};

export function DashboardShell({
  children,
  categories,
  initialCartCount = 0,
  unreadNotifications = 0,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full flex-col text-[#1d1d1f]">
      <StoreHeader categories={categories} initialCartCount={initialCartCount} />

      <div className="flex w-full min-h-0 min-w-0 flex-1 flex-col pt-6 md:pt-8">
        {/* Selaras lebar konten dengan StoreHeader: mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 */}
        <div className="mx-auto flex w-full max-w-[1400px] min-h-0 min-w-0 flex-1 flex-col px-4 sm:px-6 lg:px-8 md:flex-row md:gap-8">
          <div className="hidden w-[min(100%,17.5rem)] shrink-0 md:flex md:min-h-0 md:overflow-y-auto">
            <DashboardSidebar className="w-full" unreadNotifications={unreadNotifications} />
          </div>

          {mobileOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/40 md:hidden"
                aria-label="Tutup menu"
                onClick={() => setMobileOpen(false)}
              />
              <div className="fixed left-0 top-0 z-50 h-full w-full max-w-[17.5rem] shadow-xl md:hidden">
                <DashboardSidebar
                  className="w-full"
                  unreadNotifications={unreadNotifications}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </>
          ) : null}

          <div className="flex w-full min-w-0 flex-1 flex-col bg-white">
            <header className="flex w-full shrink-0 items-center gap-3 border-b border-[#e0e0e0] bg-white px-4 py-3 md:hidden">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 border-[#e0e0e0]"
                aria-label="Buka menu akun"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" strokeWidth={2} />
              </Button>
              <span className="text-[12px] font-semibold uppercase tracking-[-0.12px] text-[#1d1d1f]">
                Dashboard
              </span>
            </header>
            <main className="flex w-full min-h-0 flex-1 flex-col">
              <div className="mx-auto w-full max-w-4xl flex-1 pb-8 pt-2">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
