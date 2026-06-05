"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  cancelOrderAction,
  confirmOrderReceivedAction,
} from "@/app/(dashboard)/dashboard/orders/_actions";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/supabase";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export function OrderToolbar({
  orderId,
  status,
  allReviewed,
}: {
  orderId: string;
  status: OrderStatus;
  allReviewed: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const canCancel = status === "pending_payment" || status === "paid";
  const canConfirm = status === "delivered" && !allReviewed;
  const canReview = status === "completed" && !allReviewed;

  const onCancel = () => {
    toast("Batalkan pesanan ini?", {
      description: "Tindakan ini tidak dapat diurungkan.",
      action: {
        label: "Ya, batalkan",
        onClick: () => {
          startTransition(async () => {
            const res = await cancelOrderAction(orderId);
            if (res.success) {
              toast.success("Pesanan dibatalkan.");
              router.refresh();
            } else {
              toast.error(res.error);
            }
          });
        },
      },
      cancel: {
        label: "Tidak",
        onClick: () => {},
      },
    });
  };

  const onConfirm = () => {
    toast("Konfirmasi barang sudah diterima?", {
      description: "Setelah dikonfirmasi kamu akan diarahkan ke halaman ulasan.",
      action: {
        label: "Ya, sudah diterima",
        onClick: () => {
          startTransition(async () => {
            const res = await confirmOrderReceivedAction(orderId);
            if (res.success) {
              toast.success("Pesanan selesai. Silakan berikan ulasan!");
              router.push(`/dashboard/orders/${orderId}/review`);
            } else {
              toast.error(res.error);
            }
          });
        },
      },
      cancel: {
        label: "Batal",
        onClick: () => {},
      },
    });
  };

  if (!canCancel && !canConfirm && !canReview) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-3">
      {canCancel ? (
        <Button
          type="button"
          variant="destructive-ghost"
          size="sm"
          disabled={pending}
          onClick={onCancel}
        >
          Batalkan pesanan
        </Button>
      ) : null}
      {canConfirm ? (
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={onConfirm}
        >
          Selesai &amp; Beri Ulasan
        </Button>
      ) : null}
      {canReview ? (
        <Button asChild variant="primary" size="sm">
          <Link href={`/dashboard/orders/${orderId}/review`}>Beri Ulasan</Link>
        </Button>
      ) : null}
    </div>
  );
}
