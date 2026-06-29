"use client";

import Link from "next/link";
import { useState } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { confirmOrderReceivedAction } from "@/app/(dashboard)/dashboard/orders/_actions";
import { CancelOrderDialog } from "@/components/dashboard/cancel-order-dialog";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/supabase";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export function OrderToolbar({
  orderId,
  orderNumber,
  status,
  paymentType,
  savedBank,
  allReviewed,
}: {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  paymentType?: string | null;
  savedBank?: {
    bank_name: string | null;
    bank_account_name: string | null;
    bank_account_number: string | null;
  } | null;
  allReviewed: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const router = useRouter();

  const canCancel = status === "pending_payment" || status === "paid";
  const canConfirm = status === "delivered" && !allReviewed;
  const canReview = status === "completed" && !allReviewed;

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
    <>
      <div className="flex min-w-0 flex-wrap gap-3">
        {canCancel ? (
          <Button
            type="button"
            variant="destructive-ghost"
            size="sm"
            disabled={pending}
            onClick={() => setCancelOpen(true)}
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

      {canCancel && (
        <CancelOrderDialog
          orderId={orderId}
          orderNumber={orderNumber}
          status={status as "pending_payment" | "paid"}
          paymentType={paymentType}
          savedBank={savedBank}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
        />
      )}
    </>
  );
}
