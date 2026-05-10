"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImageIcon, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toggleBannerActive, deleteBanner } from "../_actions";

export type BannerRow = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

interface BannerTableProps {
  banners: BannerRow[];
}

function BannerActions({ banner }: { banner: BannerRow }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const { error } = await toggleBannerActive(banner.id, !banner.is_active);
      if (error) toast.error(error);
      else toast.success(banner.is_active ? "Banner dinonaktifkan." : "Banner diaktifkan.");
    });
  };

  const handleDelete = () => {
    if (!confirm("Hapus banner ini? Tindakan tidak bisa dibatalkan.")) return;
    startTransition(async () => {
      const { error } = await deleteBanner(banner.id);
      if (error) toast.error(error);
      else toast.success("Banner dihapus.");
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/admin/banners/${banner.id}/edit`}
        className="inline-flex rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-brand"
        aria-label="Edit banner"
      >
        <Pencil size={14} />
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        title="Hapus banner"
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive disabled:opacity-50 active:scale-[0.98]"
      >
        <Trash2 size={14} />
      </button>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "h-8 rounded-md px-3 text-[10px] font-semibold uppercase tracking-widest transition-colors disabled:opacity-50 active:scale-[0.98]",
          banner.is_active
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
        )}
      >
        {banner.is_active ? "Aktif" : "Nonaktif"}
      </button>
    </div>
  );
}

const thClass =
  "whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground";

export function BannerTable({ banners }: BannerTableProps) {
  if (banners.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 rounded-lg border border-dashed border-[#e0e0e0] py-20 dark:border-border">
        <ImageIcon size={36} strokeWidth={1} className="text-muted-foreground" />
        <p className="admin-section-title text-foreground">Belum ada banner</p>
        <Link href="/admin/banners/new" className="admin-text-link">
          Tambah banner pertama
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-utility-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[17px] leading-[1.47]">
          <thead>
            <tr className="border-b border-[#e0e0e0] bg-muted/30 dark:border-border">
              <th className={`${thClass} w-16`}>Preview</th>
              <th className={thClass}>Judul / Subtitle</th>
              <th className={`${thClass} hidden md:table-cell`}>Link</th>
              <th className={`${thClass} hidden sm:table-cell`}>Urutan</th>
              <th className={`${thClass} hidden lg:table-cell`}>Periode</th>
              <th className={thClass}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
            {banners.map((banner) => (
              <tr
                key={banner.id}
                className="transition-colors hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <div className="relative h-9 w-14 overflow-hidden rounded-lg border border-[#e0e0e0] bg-muted/30 dark:border-border">
                    <Image
                      src={banner.image_url}
                      alt={banner.title ?? "Banner"}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                </td>

                <td className="px-4 py-3">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">
                    {banner.title ?? (
                      <span className="italic text-muted-foreground">Tanpa judul</span>
                    )}
                  </p>
                  {banner.subtitle && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                      {banner.subtitle}
                    </p>
                  )}
                </td>

                <td className="hidden px-4 py-3 md:table-cell">
                  {banner.link_url ? (
                    <a
                      href={banner.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-1 max-w-[12rem] text-sm text-brand transition-opacity hover:opacity-80"
                    >
                      {banner.link_url}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>

                <td className="hidden px-4 py-3 sm:table-cell">
                  <span className="font-mono text-sm text-muted-foreground tabular-nums">
                    {banner.sort_order}
                  </span>
                </td>

                <td className="hidden px-4 py-3 lg:table-cell">
                  {banner.starts_at || banner.ends_at ? (
                    <div className="space-y-0.5 text-sm text-muted-foreground">
                      {banner.starts_at && <p>Mulai: {formatDate(banner.starts_at)}</p>}
                      {banner.ends_at && <p>Berakhir: {formatDate(banner.ends_at)}</p>}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Tidak terbatas</span>
                  )}
                </td>

                <td className="px-4 py-3">
                  <BannerActions banner={banner} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
