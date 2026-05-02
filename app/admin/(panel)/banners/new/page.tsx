import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { BannerForm } from "../_components/banner-form";

export const metadata: Metadata = { title: "Tambah Banner — Admin GeekyTech" };

export default function AdminBannerNewPage() {
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
        <h1 className="text-2xl font-black uppercase tracking-tight">Tambah Banner</h1>
      </div>

      <BannerForm />
    </div>
  );
}
