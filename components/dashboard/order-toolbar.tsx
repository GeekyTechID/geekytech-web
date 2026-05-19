"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  cancelOrderAction,
  confirmOrderReceivedAction,
  getRetryPaymentWhatsAppLink,
} from "@/app/(dashboard)/dashboard/orders/_actions";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/supabase";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export function OrderToolbar({
  orderId,
  orderNumber,
  status,
  hasPendingPayment,
}: {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  hasPendingPayment: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const canCancel = status === "pending_payment" || status === "paid";
  const canConfirm = status === "delivered";

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

  const onRetryPayment = () => {
    startTransition(async () => {
      const res = await getRetryPaymentWhatsAppLink(orderNumber);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      if (!res.url) {
        toast.message("Hubungi layanan pelanggan untuk bantuan pembayaran.");
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    });
  };

  if (!canCancel && !canConfirm && !hasPendingPayment) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-3">
      {canCancel ? (
        <Button
          type="button"
          variant="destructive-ghost"
          disabled={pending}
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Batalkan pesanan
        </Button>
      ) : null}
      {canConfirm ? (
        <Button
          type="button"
          variant="primary"
          disabled={pending}
          onClick={onConfirm}
          className="w-full sm:w-auto"
        >
          Selesai &amp; Beri Ulasan
        </Button>
      ) : null}
      {hasPendingPayment && status === "pending_payment" ? (
        <Button type="button" variant="secondary" disabled={pending} onClick={onRetryPayment} className="w-full sm:w-auto">
          Bantuan lanjut bayar (WhatsApp)
        </Button>
      ) : null}
    </div>
  );
}
