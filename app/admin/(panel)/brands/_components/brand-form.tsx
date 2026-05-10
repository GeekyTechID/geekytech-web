"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createBrand, updateBrand } from "../_actions";

const formSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100, "Nama max 100 karakter"),
  slug: z
    .string()
    .min(1, "Slug wajib diisi")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: huruf kecil, angka, dan tanda hubung"),
  logo_url: z.string(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

interface BrandFormProps {
  brandId?: string;
  defaultValues?: Partial<FormValues>;
}

const labelClass = "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground";

export function BrandForm({ brandId, defaultValues }: BrandFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(defaultValues?.logo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      fd.append("bucket", "brands");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Upload gagal.");
      setLogoUrl(json.url as string);
      setValue("logo_url", json.url as string);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      logo_url: "",
      sort_order: 0,
      is_active: true,
      ...defaultValues,
    },
  });

  const isActive = watch("is_active");

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        ...values,
        logo_url: values.logo_url || null,
      };

      const result = brandId ? await updateBrand(brandId, payload) : await createBrand(payload);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(brandId ? "Merek diperbarui." : "Merek berhasil dibuat.");
      router.push("/admin/brands");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="admin-utility-card space-y-5">
        <h2 className="admin-section-title">Info Merek</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className={labelClass}>
              Nama <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              className="h-10 rounded-lg border-[#e0e0e0] text-[17px] leading-[1.47] dark:border-border"
              placeholder="Contoh: Samsung"
              {...register("name", {
                onChange: (e) => {
                  if (!brandId) {
                    setValue("slug", slugify(e.target.value), { shouldValidate: false });
                  }
                },
              })}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug" className={labelClass}>
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              id="slug"
              className="h-10 rounded-lg border-[#e0e0e0] font-mono text-[17px] leading-[1.47] dark:border-border"
              placeholder="samsung"
              {...register("slug")}
            />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>Logo Merek</Label>
          <input type="hidden" {...register("logo_url")} />

          {logoUrl ? (
            <div className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-[#e0e0e0] bg-white dark:border-border">
              <Image src={logoUrl} alt="Logo merek" fill sizes="96px" className="object-contain p-2" />
              <button
                type="button"
                onClick={() => {
                  setLogoUrl("");
                  setValue("logo_url", "");
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                title="Hapus logo"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#e0e0e0] py-8 text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50 dark:border-border"
            >
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
              <span className="text-xs font-semibold uppercase tracking-widest">
                {uploading ? "Mengupload..." : "Klik untuk upload logo"}
              </span>
              <span className="text-[11px]">JPG, PNG, WebP — maks. 5 MB</span>
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void handleLogoUpload(e.target.files)}
          />
          {logoUrl && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="admin-text-link text-[11px]"
            >
              Ganti logo
            </button>
          )}
        </div>

        <div className="w-36 space-y-1.5">
          <Label htmlFor="sort_order" className={labelClass}>
            Urutan Tampil
          </Label>
          <Input
            id="sort_order"
            type="number"
            min="0"
            className="h-10 rounded-lg border-[#e0e0e0] text-[17px] dark:border-border"
            {...register("sort_order", { valueAsNumber: true })}
          />
          {errors.sort_order && (
            <p className="text-xs text-destructive">{errors.sort_order.message}</p>
          )}
        </div>
      </div>

      <div className="admin-utility-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="admin-section-title">Status Aktif</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Merek nonaktif tidak tampil sebagai pilihan produk.
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={(v) => setValue("is_active", v)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-brand/40 px-6 text-xs font-semibold uppercase tracking-widest text-brand hover:bg-brand/5 active:scale-[0.98]"
          onClick={() => router.push("/admin/brands")}
          disabled={isLoading}
        >
          Batal
        </Button>
        <Button
          type="submit"
          className="rounded-full border-0 bg-brand px-6 text-xs font-semibold uppercase tracking-widest text-white hover:bg-brand-hover active:scale-[0.98]"
          disabled={isLoading}
        >
          {isLoading
            ? brandId
              ? "Menyimpan..."
              : "Membuat..."
            : brandId
              ? "Simpan Perubahan"
              : "Buat Merek"}
        </Button>
      </div>
    </form>
  );
}
