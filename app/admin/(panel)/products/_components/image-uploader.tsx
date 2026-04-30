"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export type ImageItem = {
  url: string;
  is_primary: boolean;
  alt_text: string;
};

interface ImageUploaderProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
}

export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "products");

    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const json = await res.json();

    if (!res.ok || json.error) throw new Error(json.error ?? "Upload gagal.");
    return json.url as string;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).map((f) => uploadFile(f))
      );

      const newImages: ImageItem[] = uploads.map((url, i) => ({
        url,
        is_primary: images.length === 0 && i === 0,
        alt_text: "",
      }));

      onChange([...images, ...newImages]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const setPrimary = (index: number) => {
    onChange(images.map((img, i) => ({ ...img, is_primary: i === index })));
  };

  const remove = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((img) => img.is_primary)) {
      next[0].is_primary = true;
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {/* Upload zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "w-full border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 py-8 transition-colors text-muted-foreground",
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
          {uploading ? "Mengupload..." : "Klik atau drag foto produk"}
        </span>
        <span className="text-[11px]">JPG, PNG, WebP — maks. 5 MB</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {images.map((img, i) => (
            <div key={img.url} className="relative group aspect-square border border-border overflow-hidden bg-muted/30">
              <Image
                src={img.url}
                alt={img.alt_text || "Gambar produk"}
                fill
                sizes="120px"
                className="object-cover"
              />

              {img.is_primary && (
                <div className="absolute top-1 left-1 bg-[#EA5329] text-white text-[9px] font-black px-1.5 py-0.5 uppercase tracking-widest">
                  Utama
                </div>
              )}

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {!img.is_primary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(i)}
                    title="Jadikan foto utama"
                    className="p-1.5 bg-white text-black hover:bg-yellow-400 transition-colors"
                  >
                    <Star size={12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  title="Hapus foto"
                  className="p-1.5 bg-white text-black hover:bg-red-500 hover:text-white transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
