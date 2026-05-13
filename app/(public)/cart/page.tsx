import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchCartCrossSellProducts } from "@/lib/data/product-detail-page";
import { fetchUserCartWithLines } from "@/lib/data/user-cart-lines";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CartCheckoutStepper } from "@/components/store/cart-checkout-stepper";
import { CartLineCard } from "@/components/store/cart-line-card";
import { HomeProductTile } from "@/components/store/home-product-tile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Keranjang",
  description: "Review barang di keranjang belanja GeekyTech Anda sebelum checkout.",
};

export default async function CartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent("/cart")}`);
  }

  const cart = await fetchUserCartWithLines(user.id);
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

  const lines = cart.lines;
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
    excludedCategoryIds: [...new Set(cart.excludedCategoryIds)],
    excludedProductIds: [...new Set(cart.excludedProductIds)],
    limit: 5,
  });

  return (
    <div className="bg-gradient-to-b from-[#f4f1ea]/70 to-transparent pb-20 pt-6 text-[#1d1d1f] sm:pt-8">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="px-4 py-2 sm:px-6">
          <CartCheckoutStepper current={1} />
        </div>

        <div className="mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-[#e8e4dc] bg-[#faf8f4] p-3 sm:p-4">
              <h1 className="sr-only">Keranjang belanja</h1>
              <ul className="space-y-10">
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
                  <dt className="text-white/75">Sub total ({itemCount} item)</dt>
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
                className="mt-6 flex w-full items-center justify-center rounded-full bg-[#EA5329] py-3.5 text-center text-sm font-bold text-white transition hover:bg-[#d94a24]"
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
                <div key={p.productId} className="min-w-0 overflow-hidden">
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
