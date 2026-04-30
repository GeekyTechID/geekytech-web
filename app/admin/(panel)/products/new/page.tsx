import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "../_components/product-form";

export const metadata: Metadata = { title: "Tambah Produk — Admin GeekyTech" };

export default async function NewProductPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/admin/products" className="hover:text-foreground transition-colors font-medium">
          Produk
        </Link>
        <ChevronRight size={12} />
        <span className="font-bold text-foreground">Tambah Produk</span>
      </nav>

      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Tambah Produk</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Isi data produk lengkap termasuk gambar, varian, dan SEO.
        </p>
      </div>

      <ProductForm categories={categories ?? []} />
    </div>
  );
}
