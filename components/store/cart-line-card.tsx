"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Minus, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { removeCartItemAction, updateCartItemQuantityAction } from "@/app/(public)/cart/_actions";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CartLineView = {
  lineId: string;
  qty: number;
  maxQty: number;
  variantId: string;
  variantName: string;
  productName: string;
  slug: string;
  categoryLabel: string;
  descriptionExcerpt: string;
  rating: number;
  reviewCount: number;
  soldCount: number;
  listPrice: number;
  unitPrice: number;
  discountPercent: number | null;
  images: { url: string; alt: string | null }[];
  sku: string;
  /** Berat per unit (gram), untuk ongkir/checkout */
  weightGrams: number;
};

export function CartLineCard({ line }: { line: CartLineView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [imgIndex, setImgIndex] = useState(0);

  const lineTotal = line.unitPrice * line.qty;

  const images = line.images;
  const hasCarousel = images.length > 1;
  const currentImg = images.length > 0 ? images[Math.min(imgIndex, images.length - 1)]! : null;

  const bumpQty = (delta: number) => {
    const next = line.qty + delta;
    if (next < 1 || next > line.maxQty) {
      if (next > line.maxQty) toast.error("Stok tidak mencukupi.");
      return;
    }
    startTransition(async () => {
      const res = await updateCartItemQuantityAction(line.lineId, next);
      if (res.success) {
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const onRemove = () => {
    if (!window.confirm("Hapus barang ini dari keranjang?")) return;
    startTransition(async () => {
      const res = await removeCartItemAction(line.lineId);
      if (res.success) {
        toast.success("Barang dihapus.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <article className="flex flex-col gap-4 sm:flex-row sm:gap-5">
      <div className="relative mx-auto w-full max-w-[200px] shrink-0 sm:mx-0 sm:w-44">
        <div className="relative aspect-square overflow-hidden rounded-lg">
          {currentImg?.url ? (
            <Image src={currentImg.url} alt={currentImg.alt ?? line.productName} fill className="object-contain p-2" sizes="200px" />
          ) : (
            <div className="flex h-full items-center justify-center p-2 text-center text-[10px] font-semibold uppercase tracking-widest text-[#9a9590]">
              Tanpa gambar
            </div>
          )}
          {hasCarousel ? (
            <>
              <button
                type="button"
                aria-label="Gambar sebelumnya"
                disabled={pending}
                onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                className="absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e8e4dc] bg-white/95 text-[#1d1d1f] shadow-sm transition hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="Gambar berikutnya"
                disabled={pending}
                onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#e8e4dc] bg-white/95 text-[#1d1d1f] shadow-sm transition hover:bg-white disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <Link href={`/products/${line.slug}`} className="text-lg font-bold leading-snug text-[#1d1d1f] hover:text-[#EA5329]">
          {line.productName}
        </Link>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-[#9a9590]">{line.categoryLabel}</p>
        <p className="mt-1 text-sm font-medium text-[#5c5c5c]">{line.variantName}</p>
        {line.descriptionExcerpt ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#5c5c5c]">{line.descriptionExcerpt}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#5c5c5c]">
          <span className="inline-flex items-center gap-1 font-medium text-[#1d1d1f]">
            <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
            {line.rating.toFixed(1)}
          </span>
          <span className="text-[#d4d0c8]">·</span>
          <span>{line.reviewCount} ulasan</span>
          <span className="text-[#d4d0c8]">·</span>
          <span>{line.soldCount} terjual</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-normal tabular-nums text-[#1d1d1f]">{formatRupiah(line.unitPrice)}</p>
            {line.listPrice > line.unitPrice ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#9a9590] line-through">{formatRupiah(line.listPrice)}</span>
                {line.discountPercent != null ? (
                  <span className="text-sm font-bold text-[#EA5329]">{line.discountPercent}%</span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full border border-[#e8e4dc] bg-[#faf9f7] p-0.5">
              <button
                type="button"
                aria-label="Kurangi jumlah"
                disabled={pending || line.qty <= 1}
                onClick={() => bumpQty(-1)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition",
                  line.qty <= 1 ? "text-[#d4d0c8]" : "text-[#1d1d1f] hover:bg-white",
                )}
              >
                <Minus className="h-4 w-4" strokeWidth={2} />
              </button>
              <span className="min-w-[2rem] text-center text-sm font-bold tabular-nums">{line.qty}</span>
              <button
                type="button"
                aria-label="Tambah jumlah"
                disabled={pending || line.qty >= line.maxQty}
                onClick={() => bumpQty(1)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition",
                  line.qty >= line.maxQty ? "text-[#d4d0c8]" : "text-[#1d1d1f] hover:bg-white",
                )}
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <button
              type="button"
              aria-label="Hapus dari keranjang"
              disabled={pending}
              onClick={onRemove}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <p className="mt-3 text-right text-xs font-semibold text-[#7a7a7a] sm:hidden">Subtotal baris: {formatRupiah(lineTotal)}</p>

        <p className="mt-5 hidden shrink-0 self-start text-left text-base font-bold tabular-nums text-[#1d1d1f] sm:block sm:pt-1 sm:text-xl">
          {formatRupiah(lineTotal)}
        </p>
      </div>
    </article>
  );
}
