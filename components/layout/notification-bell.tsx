"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/(dashboard)/dashboard/notifications/_actions";
import {
  HEADER_DROPDOWN_MENU_CONTENT_CLASS,
  HeaderDropdownPanelHeader,
} from "@/components/shared/header-dropdown-panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChatStore } from "@/store/chat-store";
import { cn } from "@/lib/utils";

type NotifData = { orderId?: string; [key: string]: unknown } | null;

type NotifItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data: NotifData;
};

type NotifAction =
  | { kind: "url"; href: string }
  | { kind: "chat" };

function resolveNotifAction(notif: NotifItem): NotifAction {
  const orderId = notif.data?.orderId as string | undefined;

  switch (notif.type) {
    case "chat_message":
    case "chat_message_user":
    case "chat_session_closed":
      return { kind: "chat" };
    case "order_shipped":
    case "order_in_transit":
      return {
        kind: "url",
        href: orderId ? `/dashboard/orders/${orderId}/tracking` : "/dashboard/orders",
      };
    case "order_placed":
    case "payment_confirmed":
    case "payment_issue":
    case "order_delivered":
      return {
        kind: "url",
        href: orderId ? `/dashboard/orders/${orderId}` : "/dashboard/orders",
      };
    case "welcome":
      return { kind: "url", href: "/dashboard" };
    default:
      return { kind: "url", href: "/dashboard/notifications" };
  }
}

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
  const setChatOpen = useChatStore((s) => s.setOpen);

  const fetchedRef = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, []);

  useEffect(() => {
    void fetchNotifs();
  }, [fetchNotifs]);

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

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        fetchedRef.current = false;
        void fetchNotifs();
      }
    },
    [fetchNotifs],
  );

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const res = await markAllNotificationsReadAction();
      if (res.success) {
        setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnread(0);
      }
    });
  };

  const handleNotifClick = useCallback(
    (notif: NotifItem) => {
      if (!notif.is_read) {
        setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)));
        setUnread((prev) => Math.max(0, prev - 1));
        void markNotificationReadAction(notif.id);
      }
      setOpen(false);
      const action = resolveNotifAction(notif);
      if (action.kind === "chat") {
        setChatOpen(true);
      }
    },
    [setChatOpen],
  );

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <DropdownMenu open={open} onOpenChange={handleOpenChange} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="relative text-neutral-600 dark:text-muted-foreground"
            aria-label="Notifikasi"
          >
            <Bell size={18} />
            {unread > 0 ? (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-black leading-none text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className={cn("w-[min(100vw-2rem,22rem)]", HEADER_DROPDOWN_MENU_CONTENT_CLASS)}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <HeaderDropdownPanelHeader
            title="Notifikasi"
            badge={
              unread > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1.5 text-[10px] font-semibold tabular-nums">
                  {unread}
                </span>
              ) : null
            }
          />

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
              items.map((notif) => {
                const action = resolveNotifAction(notif);
                const itemClass = cn(
                  "w-full border-b border-[#e0e0e0] px-4 py-3 text-left transition-colors last:border-b-0",
                  !notif.is_read ? "bg-[#fff8f5] hover:bg-[#f5f5f7]" : "bg-white hover:bg-[#f5f5f7]",
                );
                const content = (
                  <div className="flex items-start gap-3">
                    {!notif.is_read ? (
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                    ) : (
                      <span className="mt-2 h-1.5 w-1.5 shrink-0" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold leading-[1.29] text-[#1d1d1f]">
                        {notif.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[14px] font-normal leading-[1.43] text-[#5c5c5c]">
                        {notif.body}
                      </p>
                      <p className="mt-1.5 text-[12px] leading-none text-[#7a7a7a]">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                  </div>
                );

                if (action.kind === "chat") {
                  return (
                    <button
                      key={notif.id}
                      type="button"
                      className={itemClass}
                      onClick={() => handleNotifClick(notif)}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <Link
                    key={notif.id}
                    href={action.href}
                    className={itemClass}
                    onClick={() => handleNotifClick(notif)}
                  >
                    {content}
                  </Link>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-[#e0e0e0] bg-[#f5f5f7] px-3 py-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={pending}
              disabled={unread === 0}
              onClick={handleMarkAllRead}
              className="h-auto gap-1.5 px-2 py-1.5 text-[13px] text-[#333333] hover:text-brand"
            >
              <CheckCheck size={14} aria-hidden />
              Tandai semua dibaca
            </Button>
            <Button asChild variant="link" size="sm" className="h-auto px-3 py-1.5 text-[13px]">
              <Link href="/dashboard/notifications" onClick={() => setOpen(false)}>
                Lihat selengkapnya
              </Link>
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
