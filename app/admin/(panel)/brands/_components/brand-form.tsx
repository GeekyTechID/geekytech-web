"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImagePlus, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createBrand, updateBrand } from "../_actions";

const formSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100, "Nama max 100 karakter"),
  slug: z
    .string()
    .min(1, "Slug wajib diisi")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: huruf kecil, angka, dan tanda hubung"),
  description: z.string().max(500, "Deskripsi max 500 karakter"),
  logo_url: z.string(),
  banner_url: z.string(),
  banner_secondary_url: z.string(),
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
  defaultValues?: Partial<FormValues> & {
    description?: string | null;
    banner_url?: string | null;
    banner_secondary_url?: string | null;
  };
}

const labelClass = "text-[11px] font-semibold text-foreground";

export function BrandForm({ brandId, defaultValues }: BrandFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>(defaultValues?.logo_url ?? "");
  const [bannerUrl, setBannerUrl] = useState<string>(defaultValues?.banner_url ?? "");
  const [bannerSecondaryUrl, setBannerSecondaryUrl] = useState<string>(
    defaultValues?.banner_secondary_url ?? "",
  );
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingBannerSecondary, setUploadingBannerSecondary] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const bannerSecondaryRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (
    files: FileList | null,
    setUrl: (url: string) => void,
    setField: (url: string) => void,
    setLoading: (v: boolean) => void,
    ref: React.RefObject<HTMLInputElement | null>,
  ) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      fd.append("bucket", "brands");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Upload gagal.");
      setUrl(json.url as string);
      setField(json.url as string);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setLoading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  const handleLogoUpload = (files: FileList | null) =>
    handleUpload(
      files,
      setLogoUrl,
      (url) => setValue("logo_url", url),
      setUploading,
      inputRef,
    );

  const handleBannerUpload = (files: FileList | null) =>
    handleUpload(
      files,
      setBannerUrl,
      (url) => setValue("banner_url", url),
      setUploadingBanner,
      bannerRef,
    );

  const handleBannerSecondaryUpload = (files: FileList | null) =>
    handleUpload(
      files,
      setBannerSecondaryUrl,
      (url) => setValue("banner_secondary_url", url),
      setUploadingBannerSecondary,
      bannerSecondaryRef,
    );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      slug: defaultValues?.slug ?? "",
      description: defaultValues?.description ?? "",
      logo_url: defaultValues?.logo_url ?? "",
      banner_url: defaultValues?.banner_url ?? "",
      banner_secondary_url: defaultValues?.banner_secondary_url ?? "",
      sort_order: defaultValues?.sort_order ?? 0,
      is_active: defaultValues?.is_active ?? true,
    },
  });

  const isActive = watch("is_active");

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        ...values,
        description: values.description || null,
        logo_url: values.logo_url || null,
        banner_url: values.banner_url || null,
        banner_secondary_url: values.banner_secondary_url || null,
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
      <div className="admin-utility-card space-y-5 p-6 lg:p-8">
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
          <Label htmlFor="description" className={labelClass}>
            Deskripsi
          </Label>
          <Textarea
            id="description"
            rows={3}
            className="resize-none rounded-lg border-[#e0e0e0] text-[15px] leading-relaxed dark:border-border"
            placeholder="Singkat tentang merek ini, mis. asal negara, spesialisasi produk..."
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-destructive">{errors.description.message}</p>
          )}
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
              {uploading ? <Spinner className="size-5" /> : <ImagePlus size={20} />}
              <span className="text-xs font-semibold uppercase">
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

        {/* Banner Utama */}
        <div className="space-y-1.5">
          <Label className={labelClass}>Banner Utama</Label>
          <p className="text-[11px] text-muted-foreground">
            Ditampilkan sebagai hero banner di halaman produk by brand. Rasio ideal 4:1 (mis. 1200×300px).
          </p>
          <input type="hidden" {...register("banner_url")} />

          {bannerUrl ? (
            <div className="group relative w-full overflow-hidden rounded-lg border border-[#e0e0e0] bg-muted dark:border-border" style={{ aspectRatio: "4/1" }}>
              <Image src={bannerUrl} alt="Banner utama merek" fill sizes="(max-width: 768px) 100vw, 800px" className="object-cover" />
              <button
                type="button"
                onClick={() => {
                  setBannerUrl("");
                  setValue("banner_url", "");
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                title="Hapus banner utama"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => bannerRef.current?.click()}
              disabled={uploadingBanner}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#e0e0e0] py-10 text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50 dark:border-border"
            >
              {uploadingBanner ? <Spinner className="size-5" /> : <ImagePlus size={20} />}
              <span className="text-xs font-semibold uppercase">
                {uploadingBanner ? "Mengupload..." : "Klik untuk upload banner utama"}
              </span>
              <span className="text-[11px]">JPG, PNG, WebP — maks. 5 MB — rasio 4:1</span>
            </button>
          )}

          <input
            ref={bannerRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void handleBannerUpload(e.target.files)}
          />
          {bannerUrl && (
            <button
              type="button"
              onClick={() => bannerRef.current?.click()}
              disabled={uploadingBanner}
              className="admin-text-link text-[11px]"
            >
              Ganti banner utama
            </button>
          )}
        </div>

        {/* Banner Kedua */}
        <div className="space-y-1.5">
          <Label className={labelClass}>Banner Kedua</Label>
          <p className="text-[11px] text-muted-foreground">
            Banner pendukung di bawah hero, mis. untuk promosi atau sub-kategori. Rasio ideal 3:1 (mis. 1200×400px).
          </p>
          <input type="hidden" {...register("banner_secondary_url")} />

          {bannerSecondaryUrl ? (
            <div className="group relative w-full overflow-hidden rounded-lg border border-[#e0e0e0] bg-muted dark:border-border" style={{ aspectRatio: "3/1" }}>
              <Image src={bannerSecondaryUrl} alt="Banner kedua merek" fill sizes="(max-width: 768px) 100vw, 800px" className="object-cover" />
              <button
                type="button"
                onClick={() => {
                  setBannerSecondaryUrl("");
                  setValue("banner_secondary_url", "");
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                title="Hapus banner kedua"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => bannerSecondaryRef.current?.click()}
              disabled={uploadingBannerSecondary}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#e0e0e0] py-10 text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50 dark:border-border"
            >
              {uploadingBannerSecondary ? <Spinner className="size-5" /> : <ImagePlus size={20} />}
              <span className="text-xs font-semibold uppercase">
                {uploadingBannerSecondary ? "Mengupload..." : "Klik untuk upload banner kedua"}
              </span>
              <span className="text-[11px]">JPG, PNG, WebP — maks. 5 MB — rasio 3:1</span>
            </button>
          )}

          <input
            ref={bannerSecondaryRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void handleBannerSecondaryUpload(e.target.files)}
          />
          {bannerSecondaryUrl && (
            <button
              type="button"
              onClick={() => bannerSecondaryRef.current?.click()}
              disabled={uploadingBannerSecondary}
              className="admin-text-link text-[11px]"
            >
              Ganti banner kedua
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

      <div className="admin-utility-card p-6 lg:p-8">
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
          variant="secondary"
          onClick={() => router.push("/admin/brands")}
          disabled={isLoading}
        >
          Batal
        </Button>
        <Button type="submit" variant="primary" loading={isLoading}>
          {brandId ? "Simpan Perubahan" : "Buat Merek"}
        </Button>
      </div>
    </form>
  );
}
