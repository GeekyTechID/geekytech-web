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
    if (!window.confirm("Batalkan pesanan ini?")) return;
    startTransition(async () => {
      const res = await cancelOrderAction(orderId);
      if (res.success) {
        toast.success("Pesanan dibatalkan.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const onConfirm = () => {
    if (!window.confirm("Konfirmasi barang sudah diterima?")) return;
    startTransition(async () => {
      const res = await confirmOrderReceivedAction(orderId);
      if (res.success) {
        toast.success("Terima kasih — pesanan diselesaikan.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
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

  if (!canCancel && !canConfirm) {
    return null;
  }

  return (
    <div className="mt-6 flex w-full min-w-0 flex-col gap-3 border-t border-[#e0e0e0] pt-6 sm:flex-row sm:flex-wrap">
      {canCancel ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
          className="w-full border-red-200 text-red-600 hover:bg-red-50 sm:w-auto"
        >
          Batalkan pesanan
        </Button>
      ) : null}
      {canConfirm ? (
        <Button
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className="w-full bg-[#EA5329] text-white hover:bg-[#d94a24] sm:w-auto"
        >
          Konfirmasi terima barang
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
