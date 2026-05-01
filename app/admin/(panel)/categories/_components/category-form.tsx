"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createCategory, updateCategory } from "../_actions";

// ─── Schema ─────────────────────────────────────────────────────────────────

const formSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100, "Nama max 100 karakter"),
  slug: z
    .string()
    .min(1, "Slug wajib diisi")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: huruf kecil, angka, dan tanda hubung"),
  parent_id: z.string(),
  image_url: z.string(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────────────────

type ParentCategory = { id: string; name: string };

interface CategoryFormProps {
  parentCategories: ParentCategory[];
  categoryId?: string;
  defaultValues?: Partial<FormValues>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CategoryForm({ parentCategories, categoryId, defaultValues }: CategoryFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

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
      parent_id: "",
      image_url: "",
      sort_order: 0,
      is_active: true,
      ...defaultValues,
    },
  });

  const isActive = watch("is_active");
  const imageUrl = watch("image_url");

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        ...values,
        parent_id: values.parent_id || null,
        image_url: values.image_url || null,
      };

      const result = categoryId
        ? await updateCategory(categoryId, payload)
        : await createCategory(payload);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(categoryId ? "Kategori diperbarui." : "Kategori berhasil dibuat.");
      router.push("/admin/categories");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Info Dasar */}
      <div className="space-y-5 border border-border p-6">
        <h2 className="text-xs font-black uppercase tracking-widest">Info Dasar</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Nama */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest">
              Nama <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              className="h-9 rounded-none"
              placeholder="Contoh: Laptop"
              {...register("name", {
                onChange: (e) => {
                  if (!categoryId) {
                    setValue("slug", slugify(e.target.value), { shouldValidate: false });
                  }
                },
              })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="slug" className="text-xs font-bold uppercase tracking-widest">
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              id="slug"
              className="h-9 rounded-none font-mono"
              placeholder="laptop"
              {...register("slug")}
            />
            {errors.slug && (
              <p className="text-xs text-destructive">{errors.slug.message}</p>
            )}
          </div>
        </div>

        {/* Kategori Induk */}
        <div className="space-y-1.5">
          <Label htmlFor="parent_id" className="text-xs font-bold uppercase tracking-widest">
            Kategori Induk
          </Label>
          <select
            id="parent_id"
            {...register("parent_id")}
            className="h-9 w-full rounded-none border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="">— Tidak ada (kategori utama) —</option>
            {parentCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground">
            Kosongkan jika ini adalah kategori tingkat pertama.
          </p>
        </div>

        {/* Urutan */}
        <div className="w-36 space-y-1.5">
          <Label htmlFor="sort_order" className="text-xs font-bold uppercase tracking-widest">
            Urutan Tampil
          </Label>
          <Input
            id="sort_order"
            type="number"
            min="0"
            className="h-9 rounded-none"
            {...register("sort_order", { valueAsNumber: true })}
          />
          {errors.sort_order && (
            <p className="text-xs text-destructive">{errors.sort_order.message}</p>
          )}
        </div>
      </div>

      {/* Gambar */}
      <div className="space-y-4 border border-border p-6">
        <h2 className="text-xs font-black uppercase tracking-widest">Gambar Kategori</h2>
        <div className="space-y-1.5">
          <Label htmlFor="image_url" className="text-xs font-bold uppercase tracking-widest">
            URL Gambar
          </Label>
          <Input
            id="image_url"
            className="h-9 rounded-none"
            placeholder="https://..."
            {...register("image_url")}
          />
          {errors.image_url && (
            <p className="text-xs text-destructive">{errors.image_url.message}</p>
          )}
        </div>

        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Preview gambar kategori"
            className="h-24 w-24 border border-border object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>

      {/* Status */}
      <div className="border border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest">Status Aktif</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kategori nonaktif tidak tampil di toko.
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={(v) => setValue("is_active", v)}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-none font-bold uppercase tracking-widest text-xs"
          onClick={() => router.push("/admin/categories")}
          disabled={isLoading}
        >
          Batal
        </Button>
        <Button
          type="submit"
          className="rounded-none border-0 bg-[#EA5329] font-bold uppercase tracking-widest text-xs text-white hover:bg-[#D44820]"
          disabled={isLoading}
        >
          {isLoading
            ? categoryId
              ? "Menyimpan..."
              : "Membuat..."
            : categoryId
              ? "Simpan Perubahan"
              : "Buat Kategori"}
        </Button>
      </div>
    </form>
  );
}
