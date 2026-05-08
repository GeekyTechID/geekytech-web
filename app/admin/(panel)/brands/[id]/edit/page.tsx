import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { BrandForm } from "../../_components/brand-form";

export const metadata: Metadata = { title: "Edit Merek — Admin GeekyTech" };

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, slug, logo_url, sort_order, is_active")
    .eq("id", id)
    .single();

  if (!brand) notFound();

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/admin/brands" className="font-medium transition-colors hover:text-foreground">
          Merek
        </Link>
        <ChevronRight size={12} />
        <span className="font-bold text-foreground">Edit Merek</span>
      </nav>

      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Edit Merek</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{brand.name}</p>
      </div>

      <BrandForm
        brandId={brand.id}
        defaultValues={{
          name: brand.name,
          slug: brand.slug,
          logo_url: brand.logo_url ?? "",
          sort_order: brand.sort_order,
          is_active: brand.is_active,
        }}
      />
    </div>
  );
}
