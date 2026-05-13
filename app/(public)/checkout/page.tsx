import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Selesaikan pembayaran pesanan GeekyTech Anda.",
};

export default function CheckoutPlaceholderPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center text-[#1d1d1f]">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a7a7a]">Checkout</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Segera hadir</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#5c5c5c]">
        Alur checkout penuh (alamat, pengiriman, pembayaran) sedang diintegrasikan. Barang Anda tetap aman di keranjang.
      </p>
      <Link href="/cart" className="mt-8 inline-block text-sm font-semibold text-[#EA5329] hover:underline">
        Kembali ke keranjang
      </Link>
    </div>
  );
}
