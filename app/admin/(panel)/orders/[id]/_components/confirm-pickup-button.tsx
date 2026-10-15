"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmReadyForPickup } from "../../_actions";

interface ConfirmPickupButtonProps {
  orderId: string;
  /** true = kurir drop off (admin antar ke counter), bukan dijemput. */
  dropOff?: boolean;
}

export function ConfirmPickupButton({ orderId, dropOff = false }: ConfirmPickupButtonProps) {
  const [isPending, startTransition] = useTransition();
  const method = dropOff ? "drop off" : "pickup";

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
          } else if (result.awb) {
            toast.success(`Paket dikonfirmasi siap ${method}. Nomor resi: ${result.awb}`);
          } else {
            toast.success(
              `Paket dikonfirmasi siap ${method}. Nomor resi belum terbit dari Biteship, gunakan tombol sinkron.`,
            );
          }
        });
      }}
    >
      <PackageCheck size={13} />
      {isPending ? "Mengonfirmasi..." : dropOff ? "Konfirmasi Siap Drop Off" : "Konfirmasi Siap Pickup"}
    </Button>
  );
}
