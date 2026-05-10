import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { BannerForm } from "../_components/banner-form";

export const metadata: Metadata = { title: "Tambah Banner — Admin GeekyTech" };

export default function AdminBannerNewPage() {
  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <Link
          href="/admin/banners"
          className="admin-text-link mb-4 inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={13} />
          Kembali ke daftar banner
        </Link>
        <p className="text-swiss-eyebrow">Konten</p>
        <h1 className="text-[34px] font-semibold uppercase tracking-[-0.02em] text-foreground">
          Tambah Banner
        </h1>
      </div>

      <BannerForm />
    </div>
  );
}
