"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImageOff, ImagePlus, Images, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AdminTableDeleteButton,
  AdminTableRowTextButton,
} from "@/components/admin/admin-table-row-actions";
import {
  deleteBanner,
  toggleBannerStatus,
  updateBanner,
  type BannerRow,
  type UpdateBannerData,
} from "../_actions";

// ---------------------------------------------------------------------------
// Edit Dialog
// ---------------------------------------------------------------------------

function BannerEditDialog({
  banner,
  onClose,
}: {
  banner: BannerRow;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(banner.title ?? "");
  const [imageUrl, setImageUrl] = useState(banner.image_url);
  const [linkUrl, setLinkUrl] = useState(banner.link_url ?? "");
  const [sortOrder, setSortOrder] = useState(banner.sort_order);
  const [isActive, setIsActive] = useState(banner.is_active);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    fd.append("file", files[0]);
    fd.append("bucket", "banners");

    setUploading(true);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Upload gagal.");
      setImageUrl(json.url as string);
      toast.success("Gambar berhasil diupload.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      toast.error("Gambar banner wajib diisi.");
      return;
    }
    const data: UpdateBannerData = {
      title: title || null,
      image_url: imageUrl,
      link_url: linkUrl || null,
      is_active: isActive,
      sort_order: sortOrder,
    };
    startTransition(async () => {
      const { error } = await updateBanner(banner.id, data);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Banner berhasil diperbarui.");
      onClose();
    });
  };

  const labelClass = "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title + Sort Order */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelClass}>
            Judul <span className="text-muted-foreground/60">(Opsional)</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Flash Sale"
            className="h-10 rounded-lg text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className={labelClass}>Urutan</label>
          <Input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="h-10 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Image */}
      <div className="space-y-1.5">
        <p className={labelClass}>Gambar Banner *</p>
        {imageUrl ? (
          <div className="relative aspect-[3/1] w-full overflow-hidden rounded-lg border border-[#e0e0e0] bg-muted/30 dark:border-border">
            <Image src={imageUrl} alt="Preview" fill className="object-cover" />
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="absolute right-2 top-2 rounded-lg bg-destructive p-2 text-white hover:opacity-90 active:scale-[0.98]"
              aria-label="Hapus gambar"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#e0e0e0] py-10 text-muted-foreground transition-colors dark:border-border",
              "hover:border-brand/50 hover:text-brand",
              uploading && "cursor-not-allowed opacity-50",
            )}
          >
            {uploading ? (
              <Loader2 size={20} className="animate-spin text-brand" />
            ) : (
              <ImagePlus size={20} />
            )}
            <span className="text-[11px] font-semibold uppercase tracking-widest">
              {uploading ? "Mengupload..." : "Upload gambar"}
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Link URL */}
      <div className="space-y-1.5">
        <label className={labelClass}>URL Tujuan</label>
        <Input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="/products/samsung-galaxy-s24"
          className="h-10 rounded-lg text-sm"
        />
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <p className={labelClass}>Status</p>
        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          className={cn(
            "flex h-10 w-48 items-center justify-center gap-2 rounded-lg border border-[#e0e0e0] text-[11px] font-semibold uppercase tracking-widest transition-colors dark:border-border",
            isActive
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isActive ? "bg-emerald-500" : "bg-muted-foreground",
            )}
          />
          {isActive ? "Aktif" : "Nonaktif"}
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending || uploading}
          className="flex-1 rounded-full border-[#e0e0e0] text-[11px] font-semibold uppercase tracking-widest dark:border-border"
        >
          Batal
        </Button>
        <Button
          type="submit"
          disabled={isPending || uploading}
          className="flex-1 rounded-full border-0 bg-brand text-[11px] font-semibold uppercase tracking-widest text-white hover:opacity-90 active:scale-[0.98]"
        >
          {isPending ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main Table
// ---------------------------------------------------------------------------

export function MainBannerTable({ banners }: { banners: BannerRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [editTarget, setEditTarget] = useState<BannerRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BannerRow | null>(null);

  const handleToggle = (id: string, currentActive: boolean) => {
    startTransition(async () => {
      const { error } = await toggleBannerStatus(id, !currentActive);
      if (error) toast.error(error);
      else toast.success(!currentActive ? "Banner diaktifkan." : "Banner dinonaktifkan.");
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const { error } = await deleteBanner(deleteTarget.id);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Banner dihapus.");
        setDeleteTarget(null);
      }
    });
  };

  if (banners.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-muted-foreground">
        <Images size={36} strokeWidth={1} />
        <p className="text-[11px] font-semibold uppercase tracking-widest">Belum ada banner</p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e0e0e0] bg-muted/30 dark:border-border">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Banner
                </th>
                <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:table-cell">
                  Link
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
              {banners.map((banner) => (
                <tr key={banner.id} className="transition-colors hover:bg-muted/30">
                  {/* Thumbnail + title */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-[72px] shrink-0 overflow-hidden rounded-md border border-[#e0e0e0] bg-muted/40 dark:border-border">
                        {banner.image_url ? (
                          <Image
                            src={banner.image_url}
                            alt={banner.title ?? "Banner"}
                            fill
                            className="object-cover"
                            sizes="72px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageOff size={16} className="text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
                          {banner.title ?? "—"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Urutan {banner.sort_order}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Link URL */}
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {banner.link_url ? (
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {banner.link_url}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/50">—</span>
                    )}
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest",
                        banner.is_active
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          banner.is_active ? "bg-emerald-500" : "bg-muted-foreground/50",
                        )}
                      />
                      {banner.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <AdminTableRowTextButton
                        tone="brand"
                        onClick={() => setEditTarget(banner)}
                        disabled={isPending}
                      >
                        Edit
                      </AdminTableRowTextButton>

                      <AdminTableDeleteButton onClick={() => setDeleteTarget(banner)} disabled={isPending}>
                        Hapus
                      </AdminTableDeleteButton>

                      {/* Toggle */}
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggle(banner.id, banner.is_active)}
                        className={cn(
                          "ml-1 h-8 rounded-full px-4 text-[11px] font-semibold uppercase tracking-widest transition-colors disabled:opacity-50 active:scale-[0.98]",
                          banner.is_active
                            ? "border border-[#e0e0e0] text-muted-foreground hover:bg-muted dark:border-border"
                            : "bg-emerald-600 text-white hover:bg-emerald-700",
                        )}
                      >
                        {banner.is_active ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold tracking-tight">
              Edit Banner
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Perubahan akan langsung diterapkan setelah disimpan.
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <BannerEditDialog
              key={editTarget.id}
              banner={editTarget}
              onClose={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold tracking-tight">
              Hapus Banner?
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Banner{" "}
              <span className="font-semibold text-foreground">
                &quot;{deleteTarget?.title ?? "ini"}&quot;
              </span>{" "}
              akan dihapus permanen dan tidak bisa dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full border-[#e0e0e0] text-[11px] font-semibold uppercase tracking-widest dark:border-border"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              className="flex-1 rounded-full border-0 bg-destructive text-[11px] font-semibold uppercase tracking-widest text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
