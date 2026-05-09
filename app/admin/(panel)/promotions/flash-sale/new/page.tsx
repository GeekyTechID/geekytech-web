import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { FlashSaleForm } from "../_components/flash-sale-form";

export const metadata: Metadata = { title: "Buat Flash Sale — Admin GeekyTech" };

export default function AdminFlashSaleNewPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href="/admin/promotions/flash-sale"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft size={13} />
          Kembali ke daftar flash sale
        </Link>
        <h1 className="text-2xl font-black uppercase tracking-tight">Buat Flash Sale</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Setelah dibuat, tambahkan produk di halaman detail flash sale.
        </p>
      </div>

      <FlashSaleForm />
    </div>
  );
}
