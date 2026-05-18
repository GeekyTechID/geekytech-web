"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { markAllNotificationsReadAction } from "@/app/(dashboard)/dashboard/notifications/_actions";
import { cn } from "@/lib/utils";

type NotifItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  // Use ref for fetched flag so fetchNotifs stays stable (no stale-closure issues)
  const fetchedRef = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    if (fetchedRef.current) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = (await res.json()) as { items: NotifItem[]; unread: number };
        setItems(data.items ?? []);
        setUnread(data.unread ?? 0);
        fetchedRef.current = true;
      }
    } finally {
      setLoading(false);
    }
  }, []); // stable — reads fetchedRef, not state

  // Fetch once on mount for badge count
  useEffect(() => {
    void fetchNotifs();
  }, [fetchNotifs]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  // Close on route change (navigation inside dropdown)
  useEffect(() => {
    setOpen(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => {
      setOpen(true);
      void fetchNotifs();
    }, 80);
  }, [fetchNotifs]);

  const handleMouseLeave = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  }, []);

  // Toggle on click — supports mobile/touch
  const handleBellClick = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen((v) => !v);
    void fetchNotifs();
  }, [fetchNotifs]);

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const res = await markAllNotificationsReadAction();
      if (res.success) {
        setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnread(0);
      }
    });
  };

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Bell button */}
      <button
        type="button"
        onClick={handleBellClick}
        className="relative inline-flex items-center justify-center rounded-full p-2 text-neutral-600 outline-none transition-colors hover:bg-black/[0.04] hover:text-[#1d1d1f] focus-visible:ring-2 focus-visible:ring-[#FF7A52] focus-visible:ring-offset-2 dark:hover:bg-white/10 dark:hover:text-foreground"
        aria-label="Notifikasi"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EA5329] text-[9px] font-black text-white leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white/95 shadow-none backdrop-blur-xl backdrop-saturate-150"
          role="dialog"
          aria-label="Daftar notifikasi"
        >
          {/* Header — strip gelap seperti utility / sub-nav (design.mdc) */}
          <div className="flex items-center gap-2 border-b border-black/10 bg-[#2a2a2c] px-4 py-3 text-white">
            <span className="text-[14px] font-semibold leading-[1.29] text-white">Notifikasi</span>
            {unread > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1.5 text-[10px] font-semibold tabular-nums text-white">
                {unread}
              </span>
            )}
          </div>

          {/* List — kartu utilitas; baris: hover parchment lembut (tanpa shadow) */}
          <div className="max-h-72 overflow-y-auto bg-white">
            {loading ? (
              <div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border-b border-[#e0e0e0] px-4 py-3 last:border-b-0">
                    <div className="mb-2 h-3 w-40 animate-pulse rounded bg-[#f5f5f7]" />
                    <div className="h-2.5 w-56 animate-pulse rounded bg-[#f5f5f7]" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={24} className="mx-auto mb-2 text-[#7a7a7a]/50" aria-hidden />
                <p className="text-[14px] leading-[1.43] text-[#7a7a7a]">Belum ada notifikasi</p>
              </div>
            ) : (
              items.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "border-b border-[#e0e0e0] px-4 py-3 transition-colors last:border-b-0",
                    !notif.is_read
                      ? "bg-[#fff8f5] hover:bg-[#f5f5f7]"
                      : "bg-white hover:bg-[#f5f5f7]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {!notif.is_read && (
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#EA5329]" aria-hidden />
                    )}
                    <div className={cn("min-w-0 flex-1", notif.is_read && "pl-0")}>
                      <p className="truncate text-[14px] font-semibold leading-[1.29] text-[#1d1d1f]">
                        {notif.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[14px] font-normal leading-[1.43] text-[#5c5c5c]">
                        {notif.body}
                      </p>
                      <p className="mt-1.5 text-[12px] leading-none text-[#7a7a7a]">{timeAgo(notif.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer — parchment ringan + hairline */}
          <div className="flex items-center justify-between gap-2 border-t border-[#e0e0e0] bg-[#f5f5f7] px-3 py-2.5">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={pending || unread === 0}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium leading-[1.29] text-[#333333] outline-none transition-colors hover:bg-white hover:text-[#EA5329] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#333333] focus-visible:ring-2 focus-visible:ring-[#FF7A52] focus-visible:ring-offset-2"
            >
              <CheckCheck size={14} className="shrink-0" aria-hidden />
              Tandai semua dibaca
            </button>
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-1.5 text-[13px] font-medium leading-[1.29] text-[#EA5329] outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-[#FF7A52] focus-visible:ring-offset-2 hover:underline"
            >
              Lihat selengkapnya
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
