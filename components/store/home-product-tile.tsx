import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

import { HOME_PRODUCT_FIVE_ACROSS_IMAGE_SIZES } from "@/lib/constants/home-product-row-slot";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { HomeShelfProduct } from "@/lib/data/home-storefront";

type HomeProductTileProps = {
  product: HomeShelfProduct;
  className?: string;
  /** `promoRow` / `fluidRow`: slot lebar 1/5 baris (≈254px gambar persegi pada kontainer max 1400px + gap-4); pakai `HOME_PRODUCT_FIVE_ACROSS_*`. */
  layout?: "default" | "promoRow" | "fluidRow";
};

export function HomeProductTile({ product, className, layout = "default" }: HomeProductTileProps) {
  const href = `/products/${product.slug}`;
  const showCompare = product.compareAtPrice != null && product.compareAtPrice > product.currentPrice;
  const imageSizes =
    layout === "default" ? "208px" : HOME_PRODUCT_FIVE_ACROSS_IMAGE_SIZES;

  return (
    <article
      className={cn(
        "flex snap-start flex-col bg-white dark:border-border dark:bg-background",
        layout === "default" && "w-[min(100%,11.5rem)] shrink-0 sm:w-52",
        layout === "promoRow" && "h-full w-full min-w-0 shrink-0",
        layout === "fluidRow" && "h-full min-h-0 w-full min-w-0",
        className,
      )}
    >
      <Link href={href} className="relative block aspect-square dark:bg-muted">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            fill
            sizes={imageSizes}
            className="object-contain p-2"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Tanpa gambar
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-1 text-[11px] text-neutral-500 dark:text-muted-foreground">{product.eyebrow}</p>
        <Link href={href} className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-black hover:text-brand dark:text-foreground">
          {product.name}
        </Link>
        {product.variantName && (
          <p className="line-clamp-1 text-[14px] text-neutral-500 dark:text-muted-foreground">{product.variantName}</p>
        )}
        <div className="mt-auto space-y-0.5">
          <p className="text-sm font-bold text-black dark:text-foreground">{formatRupiah(product.currentPrice)}</p>
          {showCompare && (
            <p className="text-xs text-neutral-400 line-through dark:text-muted-foreground">
              {formatRupiah(product.compareAtPrice!)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-muted-foreground">
          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
          <span className="font-medium text-neutral-800 dark:text-foreground">{product.rating.toFixed(1)}</span>
          <span className="text-neutral-300 dark:text-border">·</span>
          <span>{product.soldCount} terjual</span>
        </div>
        <Link
          href={`${href}?variant=${encodeURIComponent(product.variantId)}`}
          className="mt-1 inline-flex w-full items-center justify-center rounded-full border border-brand py-2 text-center text-xs font-bold text-brand transition hover:bg-brand hover:text-white"
        >
          + Keranjang
        </Link>
      </div>
    </article>
  );
}
