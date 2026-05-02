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
        className="inline-flex p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Edit banner"
      >
        <Pencil size={14} />
      </Link>
      <button
        onClick={handleDelete}
        disabled={isPending}
        title="Hapus banner"
        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
      >
        <Trash2 size={14} />
      </button>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "h-6 px-2 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50",
          banner.is_active
            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        {banner.is_active ? "Aktif" : "Nonaktif"}
      </button>
    </div>
  );
}

export function BannerTable({ banners }: BannerTableProps) {
  if (banners.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 border border-dashed border-border py-20 text-muted-foreground">
        <ImageIcon size={36} strokeWidth={1} />
        <p className="text-sm font-bold uppercase tracking-widest">Belum ada banner</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground w-16">
              Preview
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Judul / Subtitle
            </th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground md:table-cell">
              Link
            </th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:table-cell">
              Urutan
            </th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground lg:table-cell">
              Periode
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {banners.map((banner) => (
            <tr
              key={banner.id}
              className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
            >
              {/* Preview */}
              <td className="px-4 py-3">
                <div className="relative w-14 h-9 border border-border overflow-hidden bg-muted/30">
                  <Image
                    src={banner.image_url}
                    alt={banner.title ?? "Banner"}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
              </td>

              {/* Title */}
              <td className="px-4 py-3">
                <p className="font-medium text-sm line-clamp-1">
                  {banner.title ?? <span className="text-muted-foreground italic">Tanpa judul</span>}
                </p>
                {banner.subtitle && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {banner.subtitle}
                  </p>
                )}
              </td>

              {/* Link */}
              <td className="hidden px-4 py-3 md:table-cell">
                {banner.link_url ? (
                  <a
                    href={banner.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors line-clamp-1 max-w-[12rem]"
                  >
                    {banner.link_url}
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>

              {/* Sort order */}
              <td className="hidden px-4 py-3 sm:table-cell">
                <span className="text-xs font-mono text-muted-foreground">{banner.sort_order}</span>
              </td>

              {/* Period */}
              <td className="hidden px-4 py-3 lg:table-cell">
                {banner.starts_at || banner.ends_at ? (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {banner.starts_at && <p>Mulai: {formatDate(banner.starts_at)}</p>}
                    {banner.ends_at && <p>Berakhir: {formatDate(banner.ends_at)}</p>}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Tidak terbatas</span>
                )}
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <BannerActions banner={banner} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
