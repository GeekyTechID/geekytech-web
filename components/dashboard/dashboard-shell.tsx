"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

const SEGMENT_LABELS: Record<string, string> = {
  orders: "Pesanan",
  wishlist: "Wishlist",
  notifications: "Notifikasi",
  chat: "Chat CS",
  addresses: "Alamat",
  profile: "Profil",
  vouchers: "Voucher",
  "change-password": "Ganti Password",
  new: "Baru",
  edit: "Edit",
  tracking: "Lacak Pesanan",
  invoice: "Invoice",
  review: "Ulasan",
  complaint: "Komplain",
};

function isIdSegment(s: string) {
  return (
    s.startsWith("GT-") ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(s) ||
    /^\d+$/.test(s)
  );
}

function DashboardBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const relevant = segments.slice(1).filter((s) => !isIdSegment(s));

  if (relevant.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Ringkasan</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:flex">
          <BreadcrumbLink asChild>
            <Link href="/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {relevant.map((seg, i) => {
          const isLast = i === relevant.length - 1;
          const label = SEGMENT_LABELS[seg] ?? seg;
          const rawIdx = segments.indexOf(seg, 1);
          const href = "/" + segments.slice(0, rawIdx + 1).join("/");

          return (
            <React.Fragment key={`${seg}-${i}`}>
              <BreadcrumbSeparator className="hidden md:flex" />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

type DashboardShellProps = {
  children: React.ReactNode;
  unreadNotifications?: number;
  sidebarDefaultOpen?: boolean;
};

export function DashboardShell({
  children,
  unreadNotifications = 0,
  sidebarDefaultOpen = true,
}: DashboardShellProps) {
  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen}>
      <DashboardSidebar unreadNotifications={unreadNotifications} />
      <SidebarInset className="bg-[#fafafa]">
        <header className="flex h-11 shrink-0 items-center gap-2.5 bg-[#fafafa] px-4">
          <SidebarTrigger className="-ml-1 text-[#5c5c5c] hover:text-[#1d1d1f]" />
          <span className="select-none text-[#d4d4d4] text-sm">|</span>
          <DashboardBreadcrumb />
        </header>
        <div className="w-full flex-1 px-4 pb-12 pt-5 sm:px-5 md:px-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
