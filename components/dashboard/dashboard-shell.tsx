"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { Button } from "@/components/ui/button";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#fafafa] text-[#1d1d1f]">
      <div className="hidden md:flex md:shrink-0 md:sticky md:top-0 md:h-svh md:overflow-hidden">
        <DashboardSidebar />
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-label="Tutup menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed left-0 top-0 z-50 h-full w-[min(100vw,17rem)] shadow-xl md:hidden">
            <DashboardSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#e0e0e0] bg-white px-4 py-3 md:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 border-[#e0e0e0]"
            aria-label="Buka menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </Button>
          <span className="text-sm font-bold uppercase tracking-widest">Dashboard</span>
        </header>
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
