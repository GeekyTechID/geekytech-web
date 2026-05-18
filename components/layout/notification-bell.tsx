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
        className="p-2 text-muted-foreground hover:text-foreground transition-swiss relative"
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
        <div className="absolute right-0 top-full mt-1 w-80 bg-background border border-border z-50 shadow-sm">
          {/* Header */}
          <div className="flex items-center px-4 py-3 border-b border-border gap-2">
            <span className="text-sm font-bold">Notifikasi</span>
            {unread > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-[#EA5329]/10 text-[#EA5329] text-[10px] font-black">
                {unread}
              </span>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="px-4 py-3 border-b border-border/50 last:border-b-0">
                    <div className="h-3 w-40 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-2.5 w-56 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">Belum ada notifikasi</p>
              </div>
            ) : (
              items.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "px-4 py-3 border-b border-border/50 last:border-b-0",
                    !notif.is_read && "bg-[#EA5329]/5",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!notif.is_read && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#EA5329]" />
                    )}
                    <div className={cn("min-w-0", notif.is_read && "pl-3.5")}>
                      <p className="text-xs font-semibold text-foreground leading-snug truncate">
                        {notif.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {notif.body}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-3 py-2 gap-2">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={pending || unread === 0}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-swiss"
            >
              <CheckCheck size={13} />
              Tandai semua dibaca
            </button>
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-[#EA5329] hover:underline"
            >
              Lihat selengkapnya
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
