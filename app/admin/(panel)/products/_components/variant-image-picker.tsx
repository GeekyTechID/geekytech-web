"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Check, ImagePlus, Images } from "lucide-react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { uploadProductImage } from "./upload-image";
import type { ImageItem } from "./image-uploader";

interface VariantImagePickerProps {
  images: ImageItem[];
  value: string;
  hasError?: boolean;
  onSelect: (url: string) => void;
  onUploadNew: (item: ImageItem) => void;
}

export function VariantImagePicker({
  images,
  value,
  hasError,
  onSelect,
  onUploadNew,
}: VariantImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);

  const selected = images.find((img) => img.url === value) ?? null;

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      onUploadNew({ url, is_primary: images.length === 0, alt_text: "" });
      onSelect(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "relative size-12 shrink-0 overflow-hidden rounded-lg border bg-muted/30",
          hasError ? "border-destructive" : "border-[#e0e0e0]",
        )}
      >
        {selected ? (
          <Image src={selected.url} alt="" fill sizes="48px" className="object-cover" />
        ) : null}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-[#e0e0e0] px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand/40 hover:text-brand"
          >
            <Images size={13} />
            Pilih dari Galeri
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          {images.length === 0 ? (
            <p className="p-1 text-xs text-muted-foreground">Belum ada foto di galeri produk.</p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {images.map((img, idx) => (
                <button
                  key={img.url}
                  type="button"
                  aria-label={`Pilih foto ${idx + 1}`}
                  onClick={() => {
                    onSelect(img.url);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative aspect-square overflow-hidden rounded-md border",
                    img.url === value ? "border-brand ring-2 ring-brand/25" : "border-[#e0e0e0]",
                  )}
                >
                  <Image src={img.url} alt="" fill sizes="60px" className="object-cover" />
                  {img.url === value ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Check size={14} className="text-white" />
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "flex items-center gap-1.5 rounded-md border border-dashed border-[#e0e0e0] px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand/40 hover:text-brand",
          uploading && "cursor-not-allowed opacity-50",
        )}
      >
        {uploading ? <Spinner className="size-3.5" /> : <ImagePlus size={13} />}
        Upload Baru
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void handleUpload(e.target.files)}
      />
    </div>
  );
}
