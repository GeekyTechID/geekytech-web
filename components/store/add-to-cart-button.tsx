"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { addVariantToCart } from "@/app/(public)/products/_actions/product-detail-actions";
import { useCartStore } from "@/store/cart-store";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  variantId: string;
  className?: string;
};

export function AddToCartButton({ variantId, className }: Props) {
  const [isPending, startTransition] = useTransition();
  const incrementCart = useCartStore((s) => s.incrementCart);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }
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
      loading={isPending}
      onClick={handleClick}
      className={cn("mt-1 w-full", className)}
    >
      + Keranjang
    </Button>
  );
}
