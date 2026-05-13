"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/(dashboard)/dashboard/notifications/_actions";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/format";

type Row = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export function NotificationsPanel({ items }: { items: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#5c5c5c]">{items.filter((i) => !i.is_read).length} belum dibaca</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          className="border-[#e0e0e0]"
          onClick={() => {
            startTransition(async () => {
              const res = await markAllNotificationsReadAction();
              if (res.success) {
                toast.success("Semua ditandai dibaca.");
                router.refresh();
              } else {
                toast.error(res.error);
              }
            });
          }}
        >
          Tandai semua dibaca
        </Button>
      </div>
      <ul className="divide-y divide-[#e0e0e0] rounded-xl border border-[#e0e0e0] bg-white">
        {items.map((n) => (
          <li key={n.id} className={`px-4 py-4 ${n.is_read ? "bg-white" : "bg-[#fafafa]"}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-[#1d1d1f]">{n.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#5c5c5c]">{n.body}</p>
                <p className="mt-2 text-xs text-[#7a7a7a]">
                  {formatRelativeDate(n.created_at)} · {n.type}
                </p>
              </div>
              {!n.is_read ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                  className="shrink-0"
                  onClick={() => {
                    startTransition(async () => {
                      const res = await markNotificationReadAction(n.id);
                      if (res.success) {
                        router.refresh();
                      } else {
                        toast.error(res.error);
                      }
                    });
                  }}
                >
                  Tandai dibaca
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
