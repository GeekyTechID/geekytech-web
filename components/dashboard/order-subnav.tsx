"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { orderStatusLabel } from "@/lib/constants/order-status-labels";
import type { Database } from "@/types/supabase";
import { cn } from "@/lib/utils";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const tabs = (orderId: string): { href: string; label: string; exact?: boolean }[] => [
  { href: `/dashboard/orders/${orderId}`, label: "Ringkasan", exact: true },
  { href: `/dashboard/orders/${orderId}/tracking`, label: "Lacak kiriman" },
  { href: `/dashboard/orders/${orderId}/invoice`, label: "Invoice" },
  { href: `/dashboard/orders/${orderId}/review`, label: "Ulasan" },
  { href: `/dashboard/orders/${orderId}/complaint`, label: "Komplain" },
];

export function OrderSubNav({
  orderId,
  orderNumber,
  status,
}: {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
}) {
  const pathname = usePathname();
  const items = tabs(orderId);

  return (
    <div className="mb-8 w-full border-b border-[#e0e0e0] pb-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a7a7a]">Pesanan</p>
          <h1 className="text-xl font-bold tracking-tight text-[#1d1d1f] sm:text-2xl">{orderNumber}</h1>
          <p className="mt-1 text-sm text-[#5c5c5c]">{orderStatusLabel(status)}</p>
        </div>
      </div>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Submenu pesanan">
        {items.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition",
                active
                  ? "border-black bg-black text-white"
                  : "border-[#e0e0e0] bg-white text-[#1d1d1f] hover:border-[#1d1d1f]",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
