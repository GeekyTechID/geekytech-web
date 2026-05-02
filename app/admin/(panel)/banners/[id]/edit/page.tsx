import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { BannerForm } from "../../_components/banner-form";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Edit Banner — Admin GeekyTech` };
}

export default async function AdminBannerEditPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: banner } = await supabase
    .from("banners")
    .select("id, title, subtitle, image_url, link_url, sort_order, is_active, starts_at, ends_at")
    .eq("id", id)
    .single();

  if (!banner) notFound();

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href="/admin/banners"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft size={13} />
          Kembali ke daftar banner
        </Link>
        <h1 className="text-2xl font-black uppercase tracking-tight">Edit Banner</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {banner.title ?? "Banner tanpa judul"}
        </p>
      </div>

      <BannerForm initialData={banner} />
    </div>
  );
}
