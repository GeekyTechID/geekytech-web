"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { addVariantToCart } from "@/app/(public)/products/_actions/product-detail-actions";
import { useCartStore } from "@/store/cart-store";
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
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className={cn(
        "mt-1 inline-flex w-full items-center justify-center rounded-full border border-brand py-2 text-center text-xs font-bold text-brand transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {isPending ? "Menambahkan..." : "+ Keranjang"}
    </button>
  );
}
