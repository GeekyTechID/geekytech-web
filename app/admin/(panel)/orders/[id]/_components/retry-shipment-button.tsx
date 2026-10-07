"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { retryBiteshipShipment } from "../../_actions";

interface RetryShipmentButtonProps {
  orderId: string;
}

export function RetryShipmentButton({ orderId }: RetryShipmentButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      const result = await retryBiteshipShipment(orderId);
      if (result.error) {
        toast.error(`Gagal membuat pengiriman: ${result.error}`);
      } else {
        toast.success("Pengiriman Biteship berhasil dibuat.");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="w-full"
      onClick={handleRetry}
      disabled={isPending}
    >
      <Truck size={13} className={isPending ? "animate-pulse" : ""} />
      {isPending ? "Membuat pengiriman..." : "Buat Ulang Pengiriman Biteship"}
    </Button>
  );
}
