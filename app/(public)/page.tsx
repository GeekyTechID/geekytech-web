import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GeekyTech — Toko Tech & Gadget",
  description:
    "Toko tech & gadget terpercaya. Produk original bergaransi resmi. Pengiriman ke seluruh Indonesia.",
};

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="space-y-6 max-w-2xl">
        <p className="text-swiss-eyebrow">Selamat datang di</p>
        <h1 className="text-swiss-display">
          Geeky
          <span className="text-brand">Tech</span>
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Toko tech &amp; gadget terpercaya. Produk original bergaransi resmi.
          Pengiriman ke seluruh Indonesia.
        </p>
        <div className="w-12 h-px bg-brand mx-auto" />
        <p className="text-sm text-muted-foreground">
          Halaman beranda sedang disiapkan — FASE 4
        </p>
      </div>
    </div>
  );
}
