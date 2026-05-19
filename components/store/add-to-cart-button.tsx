"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { addVariantToCart } from "@/app/(public)/products/_actions/product-detail-actions";
import { useCartStore } from "@/store/cart-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  variantId: string;
  className?: string;
};

export function AddToCartButton({ variantId, className }: Props) {
  const [isPending, startTransition] = useTransition();
  const incrementCart = useCartStore((s) => s.incrementCart);

  const handleClick = () => {
    startTransition(async () => {
      const res = await addVariantToCart(variantId, 1);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      incrementCart(1);
      toast.success("Ditambahkan ke keranjang.");
    });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={isPending}
      onClick={handleClick}
      className={cn("mt-1 w-full", className)}
    >
      {isPending ? "Menambahkan..." : "+ Keranjang"}
    </Button>
  );
}
