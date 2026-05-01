import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { CategoryForm } from "../_components/category-form";

export const metadata: Metadata = { title: "Tambah Kategori — Admin GeekyTech" };

export default async function NewCategoryPage() {
  const supabase = await createClient();

  const { data: parentCategories } = await supabase
    .from("categories")
    .select("id, name")
    .is("parent_id", null)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="max-w-2xl space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/admin/categories" className="font-medium transition-colors hover:text-foreground">
          Kategori
        </Link>
        <ChevronRight size={12} />
        <span className="font-bold text-foreground">Tambah Kategori</span>
      </nav>

      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Tambah Kategori</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Buat kategori baru. Kategori induk bisa memiliki subkategori.
        </p>
      </div>

      <CategoryForm parentCategories={parentCategories ?? []} />
    </div>
  );
}
