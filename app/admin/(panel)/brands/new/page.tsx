import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { BrandForm } from "../_components/brand-form";

export const metadata: Metadata = { title: "Tambah Merek — Admin GeekyTech" };

export default function NewBrandPage() {
  return (
    <div className="max-w-2xl space-y-6 p-6">
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/admin/brands" className="font-medium transition-colors hover:text-foreground">
          Merek
        </Link>
        <ChevronRight size={12} />
        <span className="font-bold text-foreground">Tambah Merek</span>
      </nav>

      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Tambah Merek</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Buat merek baru untuk dihubungkan ke produk.
        </p>
      </div>

      <BrandForm />
    </div>
  );
}
