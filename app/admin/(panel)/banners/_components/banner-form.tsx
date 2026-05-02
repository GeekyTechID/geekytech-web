"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createBanner, updateBanner, type BannerFormData } from "../_actions";

type BannerFormProps = {
  initialData?: {
    id: string;
    title: string | null;
    subtitle: string | null;
    image_url: string;
    link_url: string | null;
    sort_order: number;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
  };
};

export function BannerForm({ initialData }: BannerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [subtitle, setSubtitle] = useState(initialData?.subtitle ?? "");
  const [imageUrl, setImageUrl] = useState(initialData?.image_url ?? "");
  const [linkUrl, setLinkUrl] = useState(initialData?.link_url ?? "");
  const [sortOrder, setSortOrder] = useState(initialData?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [startsAt, setStartsAt] = useState(
    initialData?.starts_at
      ? initialData.starts_at.slice(0, 16)
      : ""
  );
  const [endsAt, setEndsAt] = useState(
    initialData?.ends_at
      ? initialData.ends_at.slice(0, 16)
      : ""
  );

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const fd = new FormData();
    fd.append("file", file);
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

    const data: BannerFormData = {
      title: title || null,
      subtitle: subtitle || null,
      image_url: imageUrl,
      link_url: linkUrl || null,
      sort_order: sortOrder,
      is_active: isActive,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    };

    startTransition(async () => {
      if (initialData) {
        const { error } = await updateBanner(initialData.id, data);
        if (error) { toast.error(error); return; }
        toast.success("Banner berhasil diperbarui.");
      } else {
        const { error } = await createBanner(data);
        if (error) { toast.error(error); return; }
        toast.success("Banner berhasil dibuat.");
      }
      router.push("/admin/banners");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image upload */}
      <div className="border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-xs font-black uppercase tracking-widest">Gambar Banner *</h2>
        </div>
        <div className="p-4 space-y-3">
          {imageUrl ? (
            <div className="relative w-full aspect-[3/1] max-h-48 border border-border overflow-hidden bg-muted/30">
              <Image src={imageUrl} alt="Preview banner" fill className="object-cover" />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute top-2 right-2 p-1.5 bg-destructive text-white hover:opacity-80 transition-opacity"
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
                "w-full border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 py-12 transition-colors text-muted-foreground",
                "hover:border-foreground hover:text-foreground",
                uploading && "opacity-50 cursor-not-allowed"
              )}
            >
              {uploading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <ImagePlus size={24} />
              )}
              <span className="text-xs font-bold uppercase tracking-widest">
                {uploading ? "Mengupload..." : "Upload gambar banner"}
              </span>
              <span className="text-[11px]">JPG, PNG, WebP — maks. 5 MB · Rasio 3:1 direkomendasikan</span>
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
      </div>

      {/* Content fields */}
      <div className="border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-xs font-black uppercase tracking-widest">Konten</h2>
        </div>
        <div className="p-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Judul
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Promo Akhir Tahun"
              className="h-9 rounded-none text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Subtitle
            </label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Diskon hingga 50%"
              className="h-9 rounded-none text-sm"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              URL Link (opsional)
            </label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="/products?category=laptop"
              className="h-9 rounded-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-xs font-black uppercase tracking-widest">Pengaturan</h2>
        </div>
        <div className="p-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Urutan Tampil
            </label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
              min={0}
              className="h-9 rounded-none text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Mulai Tayang
            </label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="h-9 rounded-none text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Berakhir
            </label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="h-9 rounded-none text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Status
            </label>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={cn(
                "flex h-9 w-full items-center justify-center gap-2 border border-border text-xs font-bold uppercase tracking-widest transition-colors",
                isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isActive ? "Aktif" : "Nonaktif"}
            </button>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending || uploading}
          className="h-10 px-6 bg-swiss-black text-swiss-white text-xs font-black uppercase tracking-widest transition-opacity disabled:opacity-50"
        >
          {isPending ? "Menyimpan..." : initialData ? "Perbarui Banner" : "Buat Banner"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/banners")}
          disabled={isPending}
          className="h-10 px-4 border border-border text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
