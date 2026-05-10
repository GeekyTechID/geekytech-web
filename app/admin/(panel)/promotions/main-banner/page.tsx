import type { Metadata } from "next";
import { ImageIcon } from "lucide-react";

import { getMainBanner } from "./_actions";
import { MainBannerForm } from "./_components/main-banner-form";

export const metadata: Metadata = {
  title: "Main Banner — Promosi Admin GeekyTech",
};
export const dynamic = "force-dynamic";

export default async function MainBannerPage() {
  const banner = await getMainBanner();

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-2">
        <p className="text-swiss-eyebrow">Promosi</p>
        <h1 className="text-[34px] font-semibold uppercase tracking-[-0.02em] text-foreground">
          Main Banner
        </h1>
        <p className="text-[17px] leading-[1.47] text-muted-foreground">
          Hero banner utama yang ditampilkan di bagian atas halaman beranda.
        </p>
      </div>

      {!banner && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-900/10">
          <ImageIcon size={15} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-[13px] text-amber-700 dark:text-amber-300">
            Belum ada main banner yang dikonfigurasi. Upload gambar dan simpan untuk mulai menampilkan
            hero banner di beranda.
          </p>
        </div>
      )}

      <MainBannerForm initialData={banner} />
    </div>
  );
}
