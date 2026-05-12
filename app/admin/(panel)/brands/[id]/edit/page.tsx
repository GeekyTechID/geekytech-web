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
    .select("id, name, slug, description, logo_url, banner_url, banner_secondary_url, sort_order, is_active")
    .eq("id", id)
    .single();

  if (!brand) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-6 lg:p-8">
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/admin/brands" className="admin-text-link font-medium">
          Merek
        </Link>
        <ChevronRight size={12} />
        <span className="font-semibold text-foreground">Edit Merek</span>
      </nav>

      <div>
        <p className="text-swiss-eyebrow">Katalog</p>
        <h1 className="text-[34px] font-semibold uppercase tracking-[-0.02em] text-foreground">
          Edit Merek
        </h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">{brand.name}</p>
      </div>

      <BrandForm
        brandId={brand.id}
        defaultValues={{
          name: brand.name,
          slug: brand.slug,
          description: brand.description,
          logo_url: brand.logo_url ?? "",
          banner_url: brand.banner_url,
          banner_secondary_url: brand.banner_secondary_url,
          sort_order: brand.sort_order,
          is_active: brand.is_active,
        }}
      />
    </div>
  );
}
