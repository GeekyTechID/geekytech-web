import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { FlashSaleForm } from "../_components/flash-sale-form";

export const metadata: Metadata = { title: "Buat Flash Sale — Admin GeekyTech" };

export default function AdminFlashSaleNewPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-6 lg:p-8">
      <Link
        href="/admin/promotions/flash-sale"
        className="admin-text-link inline-flex items-center gap-1.5 text-xs font-medium"
      >
        <ArrowLeft size={13} />
        Kembali ke daftar flash sale
      </Link>

      <div>
        <p className="text-swiss-eyebrow">Promosi</p>
        <h1 className="text-[34px] font-semibold uppercase tracking-[-0.02em] text-foreground">Buat Flash Sale</h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">
          Setelah dibuat, tambahkan produk di halaman detail flash sale.
        </p>
      </div>

      <div className="admin-utility-card p-6">
        <FlashSaleForm />
      </div>
    </div>
  );
}
