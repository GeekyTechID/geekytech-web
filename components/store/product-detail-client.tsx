"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Heart, MessageCircle, Share2, Star } from "lucide-react";
import { toast } from "sonner";

import { addVariantToCart, toggleWishlistProduct } from "@/app/(public)/products/_actions/product-detail-actions";
import {
  computeVariantUnitPrice,
  pickDefaultVariantId,
} from "@/lib/utils/product-detail-pricing";
import type { ProductDetailPublic, ProductReviewPublic, RatingHistogramRow } from "@/lib/types/product-detail";
import { formatDate, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import { StarRatingDisplay } from "@/components/shared/star-rating-display";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CarouselNavButton } from "@/components/ui/carousel-nav-button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DESCRIPTION_PREVIEW_CHARS = 420;
const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export type ProductDetailClientProps = {
  product: ProductDetailPublic;
  reviews: ProductReviewPublic[];
  histogram: RatingHistogramRow[];
  /** Tidak lagi di-pass dari server — di-fetch client-side via /api/wishlist/check */
  initialInWishlist?: boolean;
  siteBaseUrl: string;
};

function buildProductUrl(siteBaseUrl: string, slug: string): string {
  const base = siteBaseUrl.replace(/\/$/, "");
  if (base.length > 0) return `${base}/products/${encodeURIComponent(slug)}`;
  if (typeof window !== "undefined") return window.location.href;
  return `/products/${slug}`;
}

function buildWhatsAppHref(productName: string, slug: string): string {
  if (!WA_NUMBER) return "#";
  const text = encodeURIComponent(`Halo GeekyTech, saya tertarik dengan produk: ${productName} (/products/${slug})`);
  return `https://wa.me/${WA_NUMBER}?text=${text}`;
}

export function ProductDetailClient({
  product,
  reviews,
  histogram,
  initialInWishlist,
  siteBaseUrl,
}: ProductDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [isPending, startTransition] = useTransition();
  const incrementCart = useCartStore((s) => s.incrementCart);
  const defaultId = useMemo(
    () => pickDefaultVariantId(product.variants, product.basePrice, product.salePrice),
    [product.variants, product.basePrice, product.salePrice],
  );
  const [variantId, setVariantId] = useState<string | null>(defaultId);
  const [qty, setQty] = useState(product.minOrderQty);
  const [imgIndex, setImgIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [detailTab, setDetailTab] = useState<"detail" | "extra">("detail");
  const [inWishlist, setInWishlist] = useState(initialInWishlist ?? false);
  const [reviewIndex, setReviewIndex] = useState(0);

  // Fetch wishlist state client-side so the product page can be ISR-cached
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/wishlist/check?productId=${product.id}`)
      .then((r) => r.json())
      .then(({ inWishlist: w }: { inWishlist: boolean }) => setInWishlist(w))
      .catch(() => {});
  }, [isAuthenticated, product.id]);

  const variant = useMemo(
    () => product.variants.find((v) => v.id === variantId) ?? product.variants[0] ?? null,
    [product.variants, variantId],
  );

  const { listPrice, unitPrice, discountPercent } = useMemo(() => {
    if (!variant) return { listPrice: 0, unitPrice: 0, discountPercent: null as number | null };
    return computeVariantUnitPrice({
      basePrice: product.basePrice,
      salePrice: product.salePrice,
      variantPrice: variant.price,
    });
  }, [variant, product.basePrice, product.salePrice]);

  const maxQty = variant?.stock ?? 0;
  const minQty = product.minOrderQty;

  const clampQty = useCallback(
    (n: number) => {
      if (maxQty <= 0) return minQty;
      return Math.min(maxQty, Math.max(minQty, n));
    },
    [maxQty, minQty],
  );

  useEffect(() => {
    setQty((q) => clampQty(q));
  }, [variant?.id, clampQty]);

  const subtotal = unitPrice * qty;
  const subtotalList = listPrice * qty;

  const images = product.images.length > 0 ? product.images : [{ url: "", alt: product.name, sortOrder: 0 }];
  const safeImgIndex = Math.min(imgIndex, Math.max(0, images.length - 1));
  const currentImage = images[safeImgIndex];

  const description = product.description?.trim() ?? "";
  const showDescToggle = description.length > DESCRIPTION_PREVIEW_CHARS;
  const descriptionPreview = descExpanded ? description : description.slice(0, DESCRIPTION_PREVIEW_CHARS);

  const totalReviews = histogram.reduce((s, h) => s + h.count, 0) || product.reviewCount;
  const histMax = Math.max(1, ...histogram.map((h) => h.count));

  const handleAddCart = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!variant || variant.stock < 1) {
      toast.error("Varian tidak tersedia atau stok habis.");
      return;
    }
    const q = clampQty(qty);
    startTransition(async () => {
      const res = await addVariantToCart(variant.id, q);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      incrementCart(q);
      toast.success("Ditambahkan ke keranjang.");
      router.refresh();
    });
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!variant || variant.stock < 1) {
      toast.error("Varian tidak tersedia atau stok habis.");
      return;
    }
    const q = clampQty(qty);
    router.push(`/checkout?buyNow=${variant.id}&qty=${q}`);
  };

  const handleWishlist = () => {
    startTransition(async () => {
      const res = await toggleWishlistProduct(product.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setInWishlist(res.inWishlist);
      toast.success(res.inWishlist ? "Disimpan ke wishlist." : "Dihapus dari wishlist.");
      router.refresh();
    });
  };

  const handleShare = async () => {
    const url = buildProductUrl(siteBaseUrl, product.slug);
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link produk disalin.");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link produk disalin.");
      } catch {
        toast.error("Tidak dapat membagikan atau menyalin link.");
      }
    }
  };

  const currentReview = reviews[reviewIndex] ?? null;

  if (product.variants.length === 0) {
    return (
      <div className="bg-white px-4 py-20 text-center text-[#1d1d1f]">
        <p className="text-[17px] text-[#7a7a7a]">Produk ini belum memiliki varian aktif.</p>
        <Link href="/" className="mt-6 inline-block text-[15px] font-semibold text-[#EA5329] hover:underline">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white text-[#1d1d1f]">
      {/* Atas: kiri info + galeri, kanan kartu belanja */}
      <section className="py-8">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between gap-10">
            <div className="min-w-0 ">
              <div className="flex flex-col lg:flex-row justify-between gap-8 sm:items-start">
                {/* Galeri */}
                <div className="mx-auto min-w-0 w-full max-w-[252px] sm:mx-0 sm:max-w-[294px] md:max-w-[315px]">
                  <div className="relative aspect-square w-full overflow-hidden">
                    {currentImage.url ? (
                      <Image
                        src={currentImage.url}
                        alt={currentImage.alt ?? product.name}
                        fill
                        className="object-contain"
                        sizes="(max-width: 640px) 252px, (max-width: 768px) 294px, 315px"
                        priority
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[#7a7a7a]">
                        Tanpa gambar
                      </div>
                    )}
                    {images.length > 1 ? (
                      <>
                        <CarouselNavButton
                          direction="prev"
                          surface="on-photo"
                          className="absolute left-2 top-1/2 -translate-y-1/2 border border-[#e0e0e0] bg-white/90 text-[#1d1d1f] shadow-sm hover:bg-white"
                          onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                        />
                        <CarouselNavButton
                          direction="next"
                          surface="on-photo"
                          className="absolute right-2 top-1/2 -translate-y-1/2 border border-[#e0e0e0] bg-white/90 text-[#1d1d1f] shadow-sm hover:bg-white"
                          onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                        />
                      </>
                    ) : null}
                  </div>
                  {images.length > 1 ? (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {images.map((im, i) => (
                        <Button
                          key={`${im.url}-${i}`}
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setImgIndex(i)}
                          className={cn(
                            "relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-[#f5f5f7] p-0",
                            i === safeImgIndex ? "border-[#EA5329] ring-2 ring-[#EA5329]/25" : "border-[#e0e0e0]",
                          )}
                          aria-label={`Gambar ${i + 1}`}
                          aria-current={i === safeImgIndex ? "true" : undefined}
                        >
                          {im.url ? (
                            <Image src={im.url} alt="" fill className="object-contain p-1" sizes="48px" />
                          ) : null}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Judul, kategori, varian, rating, harga */}
                <div className="min-w-0 space-y-3">
                  <h1 className="text-[clamp(1rem,3.5vw,1.5rem)] font-semibold leading-tight">
                    {product.name}
                  </h1>
                  {product.category ? (
                    <p className="text-[17px] text-[#7a7a7a]">{product.category.name}</p>
                  ) : null}

                  {product.variants.length > 1 ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase text-[#7a7a7a]">Varian</p>
                      <div className="flex flex-wrap gap-2">
                        {product.variants.map((v) => (
                          <ChoiceChip
                            key={v.id}
                            selected={v.id === variant?.id}
                            disabled={v.stock < 1}
                            onClick={() => {
                              setVariantId(v.id);
                              setQty((q) => clampQty(q));
                            }}
                          >
                            {v.name}
                          </ChoiceChip>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2 text-sm text-[#7a7a7a]">
                    <span className="inline-flex items-center gap-1 text-[#1d1d1f]">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                      <span className="font-semibold">{product.averageRating.toFixed(1)}</span>
                    </span>
                    <span className="text-[#d4d4d4]">·</span>
                    <span>({product.reviewCount} rating)</span>
                    <span className="text-[#d4d4d4]">·</span>
                    <span>{product.totalSold} terjual</span>
                  </div>

                  <div className="space-y-2 border-t border-[#f0f0f0] pt-5">
                    <p className="text-[clamp(1.5rem,4vw,2rem)] font-bold">{formatRupiah(unitPrice)}</p>
                    {discountPercent != null && discountPercent > 0 ? (
                      <div className="flex flex-wrap items-center gap-2 text-[17px]">
                        <span className="text-[#7a7a7a] line-through">{formatRupiah(listPrice)}</span>
                        <span className="rounded-full bg-[#EA5329]/10 px-2.5 py-0.5 text-xs font-bold text-[#EA5329]">
                          {discountPercent}% off
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Kartu belanja */}
            <aside className="w-full shrink-0 lg:min-w-[23rem] lg:max-w-[26rem] xl:min-w-[24rem] xl:max-w-[28rem]">
              <div className="rounded-[18px] border border-[#f0e8e4] bg-[#faf5f3] p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)] md:p-8 lg:px-10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <QuantityStepper
                    value={qty}
                    min={minQty}
                    max={maxQty}
                    disabled={isPending}
                    onDecrease={() => setQty((q) => clampQty(q - 1))}
                    onIncrease={() => setQty((q) => clampQty(q + 1))}
                  />
                  <p className="max-w-[14rem] text-right text-xs leading-snug text-[#7a7a7a]">
                    {maxQty < 1
                      ? "Stok habis untuk varian ini."
                      : maxQty <= 20
                        ? `Hanya ${maxQty} item yang tersisa`
                        : `Stok: ${maxQty} tersedia`}
                  </p>
                </div>

                <div className="mt-8 space-y-2 border-t border-[#eadfd8] pt-6">
                  <p className="text-sm text-[#7a7a7a]">
                    Subtotal{" "}
                    <span className="text-[23px] font-bold text-[#1d1d1f]">{formatRupiah(subtotal)}</span>
                  </p>
                  {discountPercent != null && discountPercent > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-[#7a7a7a] line-through">{formatRupiah(subtotalList)}</span>
                      <span className="rounded-full bg-[#EA5329]/12 px-2 py-0.5 text-xs font-bold text-[#EA5329]">
                        Hemat {discountPercent}%
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!variant || variant.stock < 1 || isPending}
                    onClick={handleBuyNow}
                    className="w-full"
                  >
                    Beli sekarang
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!variant || variant.stock < 1 || isPending}
                    onClick={handleAddCart}
                    className="w-full"
                  >
                    + Keranjang
                  </Button>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 border-t border-[#eadfd8] pt-6 text-[14px] font-medium">
                  <a
                    href={WA_NUMBER ? buildWhatsAppHref(product.name, product.slug) : "#"}
                    onClick={(e) => {
                      if (!WA_NUMBER) {
                        e.preventDefault();
                        toast.error("Chat WhatsApp belum dikonfigurasi.");
                      }
                    }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#EA5329] hover:underline"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    Chat
                  </a>
                  <span className="text-[#e0e0e0]" aria-hidden>
                    |
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleWishlist}
                    loading={isPending}
                    className={cn("gap-1.5", inWishlist && "text-brand")}
                  >
                    <Heart className={cn("h-4 w-4", inWishlist && "fill-current")} aria-hidden />
                    Wishlist
                  </Button>
                  <span className="text-[#e0e0e0]" aria-hidden>
                    |
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => void handleShare()}
                    className="gap-1.5 text-[#1d1d1f]"
                  >
                    <Share2 className="h-4 w-4" aria-hidden />
                    Share
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Bawah: deskripsi | rating & ulasan */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-2 md:gap-10 lg:gap-16">
            <div>
              <Tabs
                value={detailTab}
                onValueChange={(v) => setDetailTab(v as "detail" | "extra")}
                className="gap-6"
              >
                <TabsList
                  variant="line"
                  className="h-auto w-full justify-start gap-8 rounded-none border-b border-[#e0e0e0] bg-transparent p-0"
                >
                  <TabsTrigger
                    value="detail"
                    className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-3 text-[17px] font-semibold text-[#7a7a7a] shadow-none data-[state=active]:border-[#1d1d1f] data-[state=active]:bg-transparent data-[state=active]:text-[#1d1d1f]"
                  >
                    Detail
                  </TabsTrigger>
                  <TabsTrigger
                    value="extra"
                    className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-3 text-[17px] font-semibold text-[#7a7a7a] shadow-none data-[state=active]:border-[#1d1d1f] data-[state=active]:bg-transparent data-[state=active]:text-[#1d1d1f]"
                  >
                    Informasi lainnya
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="detail" className="mt-0">
                  <div className="space-y-4">
                    {description ? (
                      <>
                        <div className="whitespace-pre-wrap text-[17px] leading-[1.47] text-[#1d1d1f]">
                          {descriptionPreview}
                          {!descExpanded && showDescToggle ? "…" : null}
                        </div>
                        {showDescToggle ? (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={() => setDescExpanded((e) => !e)}
                            className="h-auto p-0 text-[15px] font-semibold"
                          >
                            {descExpanded ? "Tampilkan lebih sedikit" : "Lihat lebih lanjut"}
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-[17px] text-[#7a7a7a]">Belum ada deskripsi untuk produk ini.</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="extra" className="mt-0">
                  <div className="space-y-6 text-[17px] leading-relaxed">
                    {product.tags.length > 0 ? (
                      <div>
                        <p className="mb-2 font-semibold">Tag</p>
                        <ul className="list-inside list-disc text-[#1d1d1f]">
                          {product.tags.map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div>
                      <p className="mb-2 font-semibold">Varian & SKU</p>
                      <ul className="space-y-1 text-[#7a7a7a]">
                        {product.variants.map((v) => (
                          <li key={v.id}>
                            <span className="text-[#1d1d1f]">{v.name}</span> — {v.sku}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div>
              <h2 className="text-xl font-semibold">Rating &amp; Ulasan</h2>
              <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-start">
                <div className="shrink-0 text-center sm:text-left">
                  <p className="text-4xl font-bold leading-none">{product.averageRating.toFixed(1)}</p>
                  <p className="mt-1 text-sm text-[#7a7a7a]">/5</p>
                  <p className="mt-2 text-sm text-[#7a7a7a]">({totalReviews} rating)</p>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {histogram.map((h) => (
                    <div key={h.stars} className="flex items-center gap-3">
                      <span className="w-3 text-xs text-[#7a7a7a]">{h.stars}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0f0f0]">
                        <div
                          className="h-full rounded-full bg-[#1d1d1f]"
                          style={{ width: `${(h.count / histMax) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-[#7a7a7a]">{h.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {reviews.length > 0 && currentReview ? (
                <div className="mt-8 rounded-[18px] border border-[#f0e8e4] bg-[#faf5f3] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{currentReview.authorName}</p>
                      <StarRatingDisplay rating={currentReview.rating} size="md" className="mt-1" />
                      <p className="mt-1 text-xs text-[#7a7a7a]">{formatDate(currentReview.createdAt)}</p>
                    </div>
                    <div className="flex gap-1">
                      <CarouselNavButton
                        direction="prev"
                        surface="surface"
                        className="border border-[#e0e0e0] bg-white"
                        aria-label="Ulasan sebelumnya"
                        onClick={() => setReviewIndex((i) => (i - 1 + reviews.length) % reviews.length)}
                      />
                      <CarouselNavButton
                        direction="next"
                        surface="surface"
                        className="border border-[#e0e0e0] bg-white"
                        aria-label="Ulasan berikutnya"
                        onClick={() => setReviewIndex((i) => (i + 1) % reviews.length)}
                      />
                    </div>
                  </div>
                  {currentReview.comment ? (
                    <p className="mt-4 text-[15px] leading-relaxed text-[#1d1d1f]">{currentReview.comment}</p>
                  ) : (
                    <p className="mt-4 text-sm italic text-[#7a7a7a]">Tanpa komentar teks.</p>
                  )}
                </div>
              ) : (
                <p className="mt-8 text-sm text-[#7a7a7a]">Belum ada ulasan yang dipublikasikan.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
