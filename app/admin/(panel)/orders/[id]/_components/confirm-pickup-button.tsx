"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmReadyForPickup } from "../../_actions";

interface ConfirmPickupButtonProps {
  orderId: string;
}

export function ConfirmPickupButton({ orderId }: ConfirmPickupButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      className="w-full"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await confirmReadyForPickup(orderId);
          if (result.error) {
            toast.error(result.error);
          } else {
            toast.success("Paket dikonfirmasi siap pickup. Kurir akan datang sesuai jadwal.");
          }
        });
      }}
    >
      <PackageCheck size={13} />
      {isPending ? "Mengonfirmasi..." : "Konfirmasi Siap Pickup"}
    </Button>
  );
}
