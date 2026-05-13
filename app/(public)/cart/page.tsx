import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchCartCrossSellProducts } from "@/lib/data/product-detail-page";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { computeVariantUnitPrice } from "@/lib/utils/product-detail-pricing";
import { CartCheckoutStepper } from "@/components/store/cart-checkout-stepper";
import { CartLineCard, type CartLineView } from "@/components/store/cart-line-card";
import { HomeProductTile } from "@/components/store/home-product-tile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Keranjang",
  description: "Review barang di keranjang belanja GeekyTech Anda sebelum checkout.",
};

function firstRel<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

type ImgRow = { url: string; is_primary: boolean | null; sort_order: number | null; alt_text: string | null };

type CartQueryRow = {
  id: string;
  quantity: number;
  product_variants: {
    id: string;
    name: string;
    price: number;
    stock: number;
    reserved: number | null;
    products: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      base_price: number;
      sale_price: number | null;
      average_rating: number | null;
      review_count: number | null;
      total_sold: number | null;
      category_id: string | null;
      categories: { name: string } | { name: string }[] | null;
      product_images: ImgRow[] | null;
    } | null;
  } | null;
};

function sortImages(images: ImgRow[] | null | undefined): { url: string; alt: string | null }[] {
  if (!images?.length) return [];
  return [...images]
    .sort((a, b) => {
      const pa = a.is_primary ? 1 : 0;
      const pb = b.is_primary ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    })
    .map((i) => ({ url: i.url, alt: i.alt_text }));
}

function excerpt(text: string | null | undefined): string {
  if (!text) return "";
  const plain = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > 180 ? `${plain.slice(0, 177)}…` : plain;
}

export default async function CartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent("/cart")}`);
  }

  const { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle();
  if (!cart) {
    return (
      <div className="min-h-[50vh] bg-[#f4f1ea] px-4 py-20 text-center text-[#1d1d1f]">
        <CartCheckoutStepper current={1} />
        <h1 className="mx-auto mt-12 max-w-lg text-2xl font-bold">Keranjang</h1>
        <p className="mx-auto mt-3 max-w-lg text-[17px] text-[#7a7a7a]">Keranjang Anda masih kosong.</p>
        <Link href="/" className="mt-8 inline-block text-[15px] font-semibold text-[#EA5329] hover:underline">
          Lanjut belanja
        </Link>
      </div>
    );
  }

  const { data: rows } = await supabase
    .from("cart_items")
    .select(
      `id, quantity,
      product_variants(
        id, name, price, stock, reserved,
        products(
          id, name, slug, description, base_price, sale_price, average_rating, review_count, total_sold, category_id,
          categories:category_id(name),
          product_images(url, is_primary, sort_order, alt_text)
        )
      )`,
    )
    .eq("cart_id", cart.id);

  const items = (rows ?? []) as unknown as CartQueryRow[];

  const lines: CartLineView[] = [];
  const categoryIds = new Set<string>();
  const productIds = new Set<string>();

  for (const r of items) {
    const v = r.product_variants;
    const p = v?.products;
    if (!v || !p) continue;
    const cat = firstRel(p.categories);
    if (p.category_id) categoryIds.add(p.category_id);
    productIds.add(p.id);

    const basePrice = Number(p.base_price);
    const salePrice = p.sale_price != null ? Number(p.sale_price) : null;
    const { listPrice, unitPrice, discountPercent } = computeVariantUnitPrice({
      basePrice,
      salePrice,
      variantPrice: Number(v.price),
    });

    const maxQty = Math.max(1, v.stock - (v.reserved ?? 0));

    lines.push({
      lineId: r.id,
      qty: r.quantity,
      maxQty,
      variantId: v.id,
      variantName: v.name,
      productName: p.name,
      slug: p.slug,
      categoryLabel: cat?.name ?? "Produk",
      descriptionExcerpt: excerpt(p.description),
      rating: Number(p.average_rating ?? 0),
      reviewCount: p.review_count ?? 0,
      soldCount: p.total_sold ?? 0,
      listPrice,
      unitPrice,
      discountPercent,
      images: sortImages(p.product_images),
    });
  }

  if (lines.length === 0) {
    return (
      <div className="min-h-[50vh] bg-[#f4f1ea] px-4 py-20 text-center text-[#1d1d1f]">
        <div className="mx-auto max-w-3xl">
          <CartCheckoutStepper current={1} />
        </div>
        <h1 className="mx-auto mt-12 max-w-lg text-2xl font-bold">Keranjang</h1>
        <p className="mx-auto mt-3 max-w-lg text-[17px] text-[#7a7a7a]">Belum ada barang di keranjang.</p>
        <Link href="/" className="mt-8 inline-block text-[15px] font-semibold text-[#EA5329] hover:underline">
          Lanjut belanja
        </Link>
      </div>
    );
  }

  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const subtotalGross = lines.reduce((s, l) => s + l.listPrice * l.qty, 0);
  const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const discountTotal = Math.max(0, subtotalGross - total);
  const tax = 0;

  const crossSell = await fetchCartCrossSellProducts({
    excludedCategoryIds: [...categoryIds],
    excludedProductIds: [...productIds],
    limit: 5,
  });

  return (
    <div className="bg-[#f4f1ea] pb-20 pt-6 text-[#1d1d1f] sm:pt-8">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-[#e8e4dc] bg-white/60 px-4 py-5 sm:px-6">
          <CartCheckoutStepper current={1} />
        </div>

        <div className="mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-[#e8e4dc] bg-[#faf8f4] p-3 sm:p-4">
              <h1 className="sr-only">Keranjang belanja</h1>
              <ul className="space-y-4">
                {lines.map((line) => (
                  <li key={line.lineId}>
                    <CartLineCard line={line} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="mt-8 lg:col-span-5 lg:mt-0">
            <div className="sticky top-24 rounded-2xl bg-[#1a1a1a] p-6 text-white shadow-lg">
              <h2 className="text-lg font-bold tracking-tight">Ringkasan pesanan</h2>
              <dl className="mt-6 space-y-4 border-b border-white/15 pb-6 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-white/75">
                    Sub total ({itemCount} item)
                  </dt>
                  <dd className="shrink-0 font-semibold tabular-nums">{formatRupiah(subtotalGross)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/75">Diskon</dt>
                  <dd className={cn("shrink-0 font-semibold tabular-nums", discountTotal > 0 && "text-[#EA5329]")}>
                    {discountTotal > 0 ? `−${formatRupiah(discountTotal)}` : formatRupiah(0)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/75">Pajak</dt>
                  <dd className="shrink-0 font-semibold tabular-nums">{formatRupiah(tax)}</dd>
                </div>
              </dl>
              <div className="mt-6 flex justify-between gap-4 text-lg font-black tabular-nums">
                <span>Total</span>
                <span>{formatRupiah(total + tax)}</span>
              </div>
              <Link
                href="/checkout"
                className="mt-6 flex w-full items-center justify-center rounded-full bg-[#EA5329] py-3.5 text-center text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#d94a24]"
              >
                Beli sekarang
              </Link>
            </div>
          </aside>
        </div>

        {crossSell.length > 0 ? (
          <section className="mt-16 border-t border-[#e8e4dc] pt-12">
            <h2 className="text-lg font-bold tracking-tight text-[#1d1d1f] sm:text-xl">Produk acak dari kategori lainnya</h2>
            <p className="mt-1 text-sm text-[#7a7a7a]">Kurasi otomatis di luar kategori barang di keranjang Anda.</p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              {crossSell.map((p) => (
                <div
                  key={p.productId}
                  className="min-w-0 overflow-hidden rounded-xl border border-[#e8e4dc] bg-white shadow-sm"
                >
                  <HomeProductTile product={p} layout="fluidRow" className="h-full border-0" />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
