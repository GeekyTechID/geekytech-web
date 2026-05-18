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
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Konten</p>
          <h1 className="text-[34px] font-semibold uppercase text-foreground">
            Banner
          </h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">
            {banners?.length ?? 0} banner · diurutkan berdasarkan urutan tampil
          </p>
        </div>
        <Link
          href="/admin/banners/new"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-5 text-xs font-semibold uppercase text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          <Plus size={14} strokeWidth={2} />
          Tambah Banner
        </Link>
      </div>

      <BannerTable banners={(banners ?? []) as BannerRow[]} />
    </div>
  );
}
