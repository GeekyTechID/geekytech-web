"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { removeWishlistItemAction } from "@/app/(dashboard)/dashboard/wishlist/_actions";
import { Button } from "@/components/ui/button";

export function WishlistRemoveButton({ wishlistId }: { wishlistId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      className="border-[#e0e0e0] text-xs"
      onClick={() => {
        if (!window.confirm("Hapus dari wishlist?")) return;
        startTransition(async () => {
          const res = await removeWishlistItemAction(wishlistId);
          if (res.success) {
            toast.success("Dihapus dari wishlist.");
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
