"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  markAllAdminNotificationsReadAction,
  markAdminNotificationReadAction,
} from "@/app/admin/(panel)/notifications/_actions";
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

const TYPE_LABEL: Record<string, string> = {
  new_order: "Pesanan",
  payment_confirmed: "Pembayaran",
  payment_issue: "Pembayaran",
  low_stock: "Stok",
  new_complaint: "Komplain",
  new_review: "Ulasan",
};

export function AdminNotificationsPanel({ items }: { items: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{items.filter((i) => !i.is_read).length} belum dibaca</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const res = await markAllAdminNotificationsReadAction();
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
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {items.map((n) => (
          <li key={n.id} className={`px-4 py-4 ${n.is_read ? "" : "bg-[#EA5329]/5"}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                {TYPE_LABEL[n.type] && (
                  <span className="mb-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    {TYPE_LABEL[n.type]}
                  </span>
                )}
                <p className="font-semibold text-foreground">{n.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
                <p className="mt-2 text-xs text-muted-foreground/70">
                  {formatRelativeDate(n.created_at)}
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
                      const res = await markAdminNotificationReadAction(n.id);
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
