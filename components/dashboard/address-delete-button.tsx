"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteAddressAction } from "@/app/(dashboard)/dashboard/addresses/_actions";
import { Button } from "@/components/ui/button";

export function AddressDeleteButton({ addressId }: { addressId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive-ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Hapus alamat ini?")) return;
        startTransition(async () => {
          const res = await deleteAddressAction(addressId);
          if (res.success) {
            toast.success("Alamat dihapus.");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        });
      }}
    >
      Hapus
    </Button>
  );
}
