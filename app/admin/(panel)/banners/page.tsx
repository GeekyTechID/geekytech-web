import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { BannerTable, type BannerRow } from "./_components/banner-table";

export const metadata: Metadata = { title: "Banner — Admin GeekyTech" };
export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  const supabase = await createClient();

  const { data: banners } = await supabase
    .from("banners")
    .select("id, title, subtitle, image_url, link_url, sort_order, is_active, starts_at, ends_at, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Banner</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {banners?.length ?? 0} banner · diurutkan berdasarkan urutan tampil
          </p>
        </div>
        <Link
          href="/admin/banners/new"
          className="flex items-center gap-2 h-11 px-4 bg-swiss-black text-swiss-white text-xs font-black uppercase tracking-widest transition-opacity"
        >
          <Plus size={14} />
          Tambah Banner
        </Link>
      </div>

      {/* Table */}
      <BannerTable banners={(banners ?? []) as BannerRow[]} />
    </div>
  );
}
