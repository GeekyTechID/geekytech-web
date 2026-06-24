# Variant Image Picker & Variant Autofill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each product variant its own representative photo (picked from the product's existing gallery or uploaded fresh), auto-switch the public product page's main image when a variant is clicked, and auto-fill new variant rows in the admin form from Variant 1's data.

**Architecture:** One new DB column (`product_variants.image_id`, FK to `product_images`) with a backfill. Admin form gets a new small client component (`VariantImagePicker`) wired into the existing `product-form.tsx`; the create/update server actions insert images before variants so they can resolve the FK. The public product detail page gains an `imageId` on each variant and an `id` on each image, used purely to compute which gallery index to jump to — no new state, reuses the existing `imgIndex` mechanism.

**Tech Stack:** Next.js 15 App Router, Supabase (service client, project `xvgcmqpnrloqbneacdpx`), React Hook Form + Zod, TypeScript, Tailwind CSS, Radix Popover (`components/ui/popover.tsx`).

No automated test runner exists in this repo (`package.json` only has `lint`/`build`, no jest/vitest) — verification is `npx tsc --noEmit --pretty` after each code task, plus a manual QA pass at the end, matching the convention in `docs/superpowers/plans/2026-06-15-search-page.md`.

---

## Files

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/025_variant_image.sql` | Create | Add `image_id` column + backfill existing variants |
| `types/supabase.ts` | Modify | Add `image_id` to `product_variants` Row/Insert/Update + relationship |
| `app/admin/(panel)/products/_components/upload-image.ts` | Create | Shared `uploadProductImage()` helper (extracted from `image-uploader.tsx`) |
| `app/admin/(panel)/products/_components/image-uploader.tsx` | Modify | Use shared upload helper instead of local copy |
| `app/admin/(panel)/products/_components/variant-image-picker.tsx` | Create | Per-variant thumbnail + "pilih dari galeri" popover + "upload baru" |
| `app/admin/(panel)/products/_components/product-form.tsx` | Modify | Schema + autofill-from-Variant-1 + render the picker per variant |
| `app/admin/(panel)/products/_actions.ts` | Modify | Insert images before variants, resolve `image_url` → `image_id` |
| `app/admin/(panel)/products/[id]/edit/page.tsx` | Modify | Select `image_id`/`product_images.id`, resolve back to `image_url` for the form |
| `lib/types/product-detail.ts` | Modify | Add `id` to `ProductDetailImage`, `imageId` to `ProductDetailVariant` |
| `lib/data/product-detail-page.ts` | Modify | Select + map the new fields |
| `components/store/product-detail-client.tsx` | Modify | Switch `imgIndex` when a variant chip is clicked |

---

## Task 1: Database migration — `image_id` column + backfill

**Files:**
- Create: `supabase/migrations/025_variant_image.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/025_variant_image.sql`:

```sql
-- 025_variant_image.sql
-- Add per-variant representative image (FK to product_images).
-- Required for new/edited variants going forward; existing rows are backfilled
-- below so the public product page never has to handle a NULL image_id.

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS image_id uuid REFERENCES product_images(id) ON DELETE SET NULL;

-- Backfill: point every existing variant at its product's primary image.
UPDATE product_variants pv
SET image_id = pi.id
FROM product_images pi
WHERE pv.image_id IS NULL
  AND pi.product_id = pv.product_id
  AND pi.is_primary = true;
```

- [ ] **Step 2: Apply the migration**

Use Supabase MCP `apply_migration` (project `xvgcmqpnrloqbneacdpx`), or paste the contents into Supabase Dashboard → SQL Editor. `ADD COLUMN IF NOT EXISTS` makes it safe to re-run.

- [ ] **Step 3: Verify the backfill**

Run this query (MCP `execute_sql` or SQL Editor) and confirm it returns 0 rows, or only rows for products that have zero `product_images` at all (data already missing photos — pre-existing issue, not something this migration can fix):

```sql
SELECT pv.id, pv.product_id
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
WHERE pv.image_id IS NULL
  AND EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = pv.product_id);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/025_variant_image.sql
git commit -m "feat(db): add product_variants.image_id with backfill from primary image"
```

---

## Task 2: Update generated Supabase types

**Files:**
- Modify: `types/supabase.ts:1195-1253`

- [ ] **Step 1: Add `image_id` to the `product_variants` type block**

Find the block (currently `types/supabase.ts:1195-1253`):

```typescript
      product_variants: {
        Row: {
          created_at: string
          height: number
          id: string
          is_active: boolean
          length: number
          name: string
          price: number
          product_id: string
          reserved: number
          sku: string
          stock: number
          updated_at: string
          weight: number
          width: number
        }
        Insert: {
          created_at?: string
          height?: number
          id?: string
          is_active?: boolean
          length?: number
          name: string
          price: number
          product_id: string
          reserved?: number
          sku: string
          stock?: number
          updated_at?: string
          weight: number
          width?: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          is_active?: boolean
          length?: number
          name?: string
          price?: number
          product_id?: string
          reserved?: number
          sku?: string
          stock?: number
          updated_at?: string
          weight?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
```

Replace it with:

```typescript
      product_variants: {
        Row: {
          created_at: string
          height: number
          id: string
          image_id: string | null
          is_active: boolean
          length: number
          name: string
          price: number
          product_id: string
          reserved: number
          sku: string
          stock: number
          updated_at: string
          weight: number
          width: number
        }
        Insert: {
          created_at?: string
          height?: number
          id?: string
          image_id?: string | null
          is_active?: boolean
          length?: number
          name: string
          price: number
          product_id: string
          reserved?: number
          sku: string
          stock?: number
          updated_at?: string
          weight: number
          width?: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          image_id?: string | null
          is_active?: boolean
          length?: number
          name?: string
          price?: number
          product_id?: string
          reserved?: number
          sku?: string
          stock?: number
          updated_at?: string
          weight?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "product_images"
            referencedColumns: ["id"]
          },
        ]
      }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: no errors referencing `types/supabase.ts`

- [ ] **Step 3: Commit**

```bash
git add types/supabase.ts
git commit -m "chore(types): add product_variants.image_id to generated Supabase types"
```

---

## Task 3: Extract shared image upload helper

**Files:**
- Create: `app/admin/(panel)/products/_components/upload-image.ts`
- Modify: `app/admin/(panel)/products/_components/image-uploader.tsx:26-36`

- [ ] **Step 1: Create the shared helper**

Create `app/admin/(panel)/products/_components/upload-image.ts`:

```typescript
export async function uploadProductImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("bucket", "products");

  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const json = await res.json();

  if (!res.ok || json.error) throw new Error(json.error ?? "Upload gagal.");
  return json.url as string;
}
```

- [ ] **Step 2: Use it from `image-uploader.tsx`**

In `app/admin/(panel)/products/_components/image-uploader.tsx`, replace the local `uploadFile` function (lines 26-36):

```typescript
  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "products");

    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const json = await res.json();

    if (!res.ok || json.error) throw new Error(json.error ?? "Upload gagal.");
    return json.url as string;
  };
```

with an import + call to the shared helper:

```typescript
import { uploadProductImage } from "./upload-image";
```

(add near the top, with the other imports) and change the call site inside `handleFiles`:

```typescript
      const uploads = await Promise.all(Array.from(files).map((f) => uploadFile(f)));
```

becomes:

```typescript
      const uploads = await Promise.all(Array.from(files).map((f) => uploadProductImage(f)));
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: no errors referencing either file

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(panel)/products/_components/upload-image.ts" "app/admin/(panel)/products/_components/image-uploader.tsx"
git commit -m "refactor(admin): extract shared uploadProductImage helper"
```

---

## Task 4: Variant image picker component

**Files:**
- Create: `app/admin/(panel)/products/_components/variant-image-picker.tsx`

- [ ] **Step 1: Create the component**

Create `app/admin/(panel)/products/_components/variant-image-picker.tsx`:

```tsx
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
            className="flex items-center gap-1.5 rounded-lg border border-[#e0e0e0] px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand/40 hover:text-brand"
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
              {images.map((img) => (
                <button
                  key={img.url}
                  type="button"
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
          "flex items-center gap-1.5 rounded-lg border border-dashed border-[#e0e0e0] px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand/40 hover:text-brand",
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
```

Note: error *text* is left to the caller's `Field` wrapper (see Task 5) — this component only takes `hasError` to redden the thumbnail border, so the message isn't rendered twice.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: no errors referencing `variant-image-picker.tsx`

- [ ] **Step 3: Commit**

```bash
git add "app/admin/(panel)/products/_components/variant-image-picker.tsx"
git commit -m "feat(admin): add VariantImagePicker component"
```

---

## Task 5: Wire the picker + autofill into `product-form.tsx`

**Files:**
- Modify: `app/admin/(panel)/products/_components/product-form.tsx`

- [ ] **Step 1: Add `image_url` to the variant schema**

In `app/admin/(panel)/products/_components/product-form.tsx:29-40`, change:

```typescript
const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama varian wajib diisi"),
  sku: z.string().trim().min(1, "SKU wajib diisi"),
  price: z.number().min(0, "Harga tidak boleh negatif"),
  stock: z.number().min(0, "Stok tidak boleh negatif"),
  weight: z.number().min(1, "Berat minimal 1 gram"),
  length: z.number().min(0),
  width: z.number().min(0),
  height: z.number().min(0),
  is_active: z.boolean(),
});
```

to:

```typescript
const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama varian wajib diisi"),
  sku: z.string().trim().min(1, "SKU wajib diisi"),
  price: z.number().min(0, "Harga tidak boleh negatif"),
  stock: z.number().min(0, "Stok tidak boleh negatif"),
  weight: z.number().min(1, "Berat minimal 1 gram"),
  length: z.number().min(0),
  width: z.number().min(0),
  height: z.number().min(0),
  is_active: z.boolean(),
  image_url: z.string().min(1, "Foto varian wajib diisi"),
});
```

- [ ] **Step 2: Add `image_url` to `FormValues` and `DefaultVariant`**

In `FormValues` (`product-form.tsx:74-85`), the `variants` array item type, add `image_url: string;` after `is_active: boolean;`.

In `DefaultVariant` (`product-form.tsx:120-131`), add `image_url: string;` after `is_active: boolean;`.

- [ ] **Step 3: Add `image_url` to the initial blank-variant default**

In the `useForm` `defaultValues.variants` fallback (`product-form.tsx:214-226`):

```typescript
          : [
              {
                name: "Default",
                sku: "",
                price: 0,
                stock: 0,
                weight: 500,
                length: 0,
                width: 0,
                height: 0,
                is_active: true,
              },
            ],
```

becomes:

```typescript
          : [
              {
                name: "Default",
                sku: "",
                price: 0,
                stock: 0,
                weight: 500,
                length: 0,
                width: 0,
                height: 0,
                is_active: true,
                image_url: "",
              },
            ],
```

- [ ] **Step 4: Import `VariantImagePicker` and add `getValues` to the form destructure**

Add the import near the other local component imports (`product-form.tsx:18`):

```typescript
import { VariantImagePicker } from "./variant-image-picker";
```

In the destructure of `form` (`product-form.tsx:230-239`):

```typescript
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = form;
```

becomes:

```typescript
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = form;
```

- [ ] **Step 5: Autofill from Variant 1 in the "Tambah Varian" handler**

In `product-form.tsx:664-687`, replace the `append` call:

```typescript
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="border-dashed"
              onClick={() => {
                const nextIndex = fields.length;
                append({
                  name: "",
                  sku: "",
                  price: 0,
                  stock: 0,
                  weight: 500,
                  length: 0,
                  width: 0,
                  height: 0,
                  is_active: true,
                });
                setExpandedVariants((prev) => [...prev, nextIndex]);
              }}
            >
              <Plus size={13} className="mr-1.5" />
              Tambah Varian
            </Button>
```

becomes:

```typescript
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="border-dashed"
              onClick={() => {
                const nextIndex = fields.length;
                const base = getValues("variants.0");
                append({
                  name: "",
                  sku: "",
                  price: base?.price ?? 0,
                  stock: base?.stock ?? 0,
                  weight: base?.weight ?? 500,
                  length: base?.length ?? 0,
                  width: base?.width ?? 0,
                  height: base?.height ?? 0,
                  is_active: base?.is_active ?? true,
                  image_url: "",
                });
                setExpandedVariants((prev) => [...prev, nextIndex]);
              }}
            >
              <Plus size={13} className="mr-1.5" />
              Tambah Varian
            </Button>
```

`name`, `sku`, and `image_url` stay blank — those are always unique per variant. Every other field always copies from Varian 1 (`variants.0`), regardless of which variant was edited most recently.

- [ ] **Step 6: Render the picker inside the variant card body**

In `product-form.tsx`, the variant body grid (`product-form.tsx:593-657`) starts with:

```tsx
                      <div className="grid grid-cols-1 gap-3 border-t border-[#e0e0e0] px-4 pb-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                        <Field label="Nama Varian" error={variantErrors?.name?.message} required>
```

Add a new `Field` for the image picker right before the "Nama Varian" field, spanning the full row:

```tsx
                      <div className="grid grid-cols-1 gap-3 border-t border-[#e0e0e0] px-4 pb-4 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                        <Field
                          label="Foto Varian"
                          error={variantErrors?.image_url?.message}
                          required
                          className="sm:col-span-2 lg:col-span-3"
                        >
                          <VariantImagePicker
                            images={images}
                            value={watch(`variants.${i}.image_url`)}
                            hasError={!!variantErrors?.image_url}
                            onSelect={(url) =>
                              setValue(`variants.${i}.image_url`, url, { shouldValidate: true })
                            }
                            onUploadNew={(item) => setImages((prev) => [...prev, item])}
                          />
                        </Field>
                        <Field label="Nama Varian" error={variantErrors?.name?.message} required>
```

- [ ] **Step 7: Add the `className` prop to `Field`**

`Field` (`product-form.tsx:788-814`) doesn't currently accept a `className`. Update it:

```typescript
function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
```

becomes:

```typescript
function Field({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: no errors referencing `product-form.tsx`

- [ ] **Step 9: Commit**

```bash
git add "app/admin/(panel)/products/_components/product-form.tsx"
git commit -m "feat(admin): add variant image picker and autofill new variants from Variant 1"
```

---

## Task 6: Resolve `image_url` → `image_id` in the server actions

**Files:**
- Modify: `app/admin/(panel)/products/_actions.ts`

- [ ] **Step 1: Add `image_url` to `VariantInput`**

In `_actions.ts:13-24`:

```typescript
export type VariantInput = {
  id?: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  is_active: boolean;
};
```

becomes:

```typescript
export type VariantInput = {
  id?: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  is_active: boolean;
  image_url: string;
};
```

- [ ] **Step 2: Rewrite `createProduct` to insert images first and resolve `image_id`**

Replace the body of `createProduct` (`_actions.ts:69-146`) — from the variants insert through the end of the function:

```typescript
  const { error: variantsError } = await supabase.from("product_variants").insert(
    normalizedVariants.map((v) => ({
      product_id: product.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      weight: v.weight,
      length: v.length,
      width: v.width,
      height: v.height,
      is_active: v.is_active,
    }))
  );

  if (variantsError) {
    await supabase.from("products").delete().eq("id", product.id);
    if (variantsError.code === "23505") return { error: "SKU varian sudah digunakan produk lain." };
    return { error: `Gagal menyimpan varian: ${variantsError.message}` };
  }

  await Promise.all([
    data.images.length > 0
      ? supabase.from("product_images").insert(
          data.images.map((img, i) => ({
            product_id: product.id,
            url: img.url,
            is_primary: img.is_primary,
            alt_text: img.alt_text || null,
            sort_order: i,
          }))
        )
      : null,
    data.tags.length > 0
      ? supabase.from("product_tags").insert(
          data.tags.map((tag) => ({ product_id: product.id, tag }))
        )
      : null,
  ]);

  revalidatePath("/admin/products");
  return { id: product.id };
}
```

with:

```typescript
  // Images must exist before variants so each variant can reference a real
  // product_images.id via the image_url -> id map built below.
  const imageIdByUrl = new Map<string, string>();
  if (data.images.length > 0) {
    const { data: insertedImages, error: imagesError } = await supabase
      .from("product_images")
      .insert(
        data.images.map((img, i) => ({
          product_id: product.id,
          url: img.url,
          is_primary: img.is_primary,
          alt_text: img.alt_text || null,
          sort_order: i,
        }))
      )
      .select("id, url");

    if (imagesError) {
      await supabase.from("products").delete().eq("id", product.id);
      return { error: `Gagal menyimpan gambar: ${imagesError.message}` };
    }
    for (const img of insertedImages ?? []) imageIdByUrl.set(img.url, img.id);
  }

  for (const v of normalizedVariants) {
    if (!imageIdByUrl.has(v.image_url)) {
      await supabase.from("products").delete().eq("id", product.id);
      return { error: "Foto varian tidak valid, coba upload ulang." };
    }
  }

  const { error: variantsError } = await supabase.from("product_variants").insert(
    normalizedVariants.map((v) => ({
      product_id: product.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      weight: v.weight,
      length: v.length,
      width: v.width,
      height: v.height,
      is_active: v.is_active,
      image_id: imageIdByUrl.get(v.image_url),
    }))
  );

  if (variantsError) {
    await supabase.from("products").delete().eq("id", product.id);
    if (variantsError.code === "23505") return { error: "SKU varian sudah digunakan produk lain." };
    return { error: `Gagal menyimpan varian: ${variantsError.message}` };
  }

  if (data.tags.length > 0) {
    await supabase.from("product_tags").insert(
      data.tags.map((tag) => ({ product_id: product.id, tag }))
    );
  }

  revalidatePath("/admin/products");
  return { id: product.id };
}
```

(`products` has `ON DELETE CASCADE` to both `product_images` and `product_variants` per `supabase/migrations/001_schema.sql:118` and `:128`, so deleting the product on failure also cleans up any images already inserted in this same call.)

- [ ] **Step 3: Rewrite the image-replace block in `updateProduct` to capture ids**

In `updateProduct` (`_actions.ts:148-315`), replace:

```typescript
  // Replace images
  await supabase.from("product_images").delete().eq("product_id", id);
  if (data.images.length > 0) {
    await supabase.from("product_images").insert(
      data.images.map((img, i) => ({
        product_id: id,
        url: img.url,
        is_primary: img.is_primary,
        alt_text: img.alt_text || null,
        sort_order: i,
      }))
    );
  }
```

with:

```typescript
  // Replace images, capturing fresh ids so variants below can resolve image_id
  await supabase.from("product_images").delete().eq("product_id", id);
  const imageIdByUrl = new Map<string, string>();
  if (data.images.length > 0) {
    const { data: insertedImages, error: imagesError } = await supabase
      .from("product_images")
      .insert(
        data.images.map((img, i) => ({
          product_id: id,
          url: img.url,
          is_primary: img.is_primary,
          alt_text: img.alt_text || null,
          sort_order: i,
        }))
      )
      .select("id, url");

    if (imagesError) {
      return { error: `Gagal menyimpan gambar: ${imagesError.message}` };
    }
    for (const img of insertedImages ?? []) imageIdByUrl.set(img.url, img.id);
  }

  for (const v of normalizedVariants) {
    if (!imageIdByUrl.has(v.image_url)) {
      return { error: "Foto varian tidak valid, coba upload ulang." };
    }
  }
```

Placing the `image_url` validation loop here means it runs before Phase 1's SKU-clearing below, so a bad `image_url` never leaves variants with temporary SKUs.

- [ ] **Step 4: Add `image_id` to the variant update and insert calls**

Still in `updateProduct`, the per-variant loop (`_actions.ts:263-301`):

```typescript
  for (const v of normalizedVariants) {
    if (v.id && existingIds.includes(v.id)) {
      const { error: updateVariantError } = await supabase
        .from("product_variants")
        .update({
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          weight: v.weight,
          length: v.length,
          width: v.width,
          height: v.height,
          is_active: v.is_active,
        })
        .eq("id", v.id)
        .eq("product_id", id);
      if (updateVariantError) {
        if (updateVariantError.code === "23505") return { error: "SKU varian sudah digunakan produk lain." };
        return { error: `Gagal memperbarui varian: ${updateVariantError.message}` };
      }
    } else {
      const { error: insertVariantError } = await supabase.from("product_variants").insert({
        product_id: id,
        name: v.name,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        weight: v.weight,
        length: v.length,
        width: v.width,
        height: v.height,
        is_active: v.is_active,
      });
      if (insertVariantError) {
        if (insertVariantError.code === "23505") return { error: "SKU varian sudah digunakan produk lain." };
        return { error: `Gagal menambah varian: ${insertVariantError.message}` };
      }
    }
  }
```

becomes:

```typescript
  for (const v of normalizedVariants) {
    const imageId = imageIdByUrl.get(v.image_url);

    if (v.id && existingIds.includes(v.id)) {
      const { error: updateVariantError } = await supabase
        .from("product_variants")
        .update({
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          weight: v.weight,
          length: v.length,
          width: v.width,
          height: v.height,
          is_active: v.is_active,
          image_id: imageId,
        })
        .eq("id", v.id)
        .eq("product_id", id);
      if (updateVariantError) {
        if (updateVariantError.code === "23505") return { error: "SKU varian sudah digunakan produk lain." };
        return { error: `Gagal memperbarui varian: ${updateVariantError.message}` };
      }
    } else {
      const { error: insertVariantError } = await supabase.from("product_variants").insert({
        product_id: id,
        name: v.name,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        weight: v.weight,
        length: v.length,
        width: v.width,
        height: v.height,
        is_active: v.is_active,
        image_id: imageId,
      });
      if (insertVariantError) {
        if (insertVariantError.code === "23505") return { error: "SKU varian sudah digunakan produk lain." };
        return { error: `Gagal menambah varian: ${insertVariantError.message}` };
      }
    }
  }
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: no errors referencing `_actions.ts`

- [ ] **Step 6: Commit**

```bash
git add "app/admin/(panel)/products/_actions.ts"
git commit -m "feat(admin): resolve variant image_url to image_id on create/update"
```

---

## Task 7: Load each variant's current image in the edit page

**Files:**
- Modify: `app/admin/(panel)/products/[id]/edit/page.tsx`

- [ ] **Step 1: Select `id` on images and `image_id` on variants**

In `[id]/edit/page.tsx:24-29`, change the select string:

```typescript
      .select(
        `id, name, slug, description, base_price, sale_price, min_order_qty,
         category_id, brand_id, condition, is_active, is_featured, meta_title, meta_description, deleted_at,
         product_images(url, is_primary, alt_text, sort_order),
         product_variants(id, name, sku, price, stock, weight, length, width, height, is_active),
         product_tags(tag)`,
      )
```

to:

```typescript
      .select(
        `id, name, slug, description, base_price, sale_price, min_order_qty,
         category_id, brand_id, condition, is_active, is_featured, meta_title, meta_description, deleted_at,
         product_images(id, url, is_primary, alt_text, sort_order),
         product_variants(id, name, sku, price, stock, weight, length, width, height, is_active, image_id),
         product_tags(tag)`,
      )
```

- [ ] **Step 2: Resolve each variant's `image_id` back to a `url` for the form**

In `[id]/edit/page.tsx:42-63`, after `defaultImages` is built, add a lookup map and use it when building `defaultVariants`:

```typescript
  const defaultImages: ImageItem[] = [...(product.product_images ?? [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img) => ({
      url: img.url,
      is_primary: img.is_primary,
      alt_text: img.alt_text ?? "",
    }));

  const defaultVariants = [...(product.product_variants ?? [])]
    .filter((v) => v.is_active)
    .map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      weight: v.weight,
      length: v.length ?? 0,
      width: v.width ?? 0,
      height: v.height ?? 0,
      is_active: v.is_active,
    }));
```

becomes:

```typescript
  const defaultImages: ImageItem[] = [...(product.product_images ?? [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img) => ({
      url: img.url,
      is_primary: img.is_primary,
      alt_text: img.alt_text ?? "",
    }));

  const imageUrlById = new Map(
    (product.product_images ?? []).map((img) => [img.id, img.url]),
  );

  const defaultVariants = [...(product.product_variants ?? [])]
    .filter((v) => v.is_active)
    .map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      weight: v.weight,
      length: v.length ?? 0,
      width: v.width ?? 0,
      height: v.height ?? 0,
      is_active: v.is_active,
      image_url: imageUrlById.get(v.image_id) ?? "",
    }));
```

If `image_url` resolves to `""` (variant's image was deleted from the gallery since it was assigned), the form's `image_url` validation will flag it on next save — admin has to pick a new one, which is the correct behavior per the "wajib" requirement.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: no errors referencing `[id]/edit/page.tsx`

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(panel)/products/[id]/edit/page.tsx"
git commit -m "feat(admin): resolve variant image_id back to image_url when editing a product"
```

---

## Task 8: Public product detail types

**Files:**
- Modify: `lib/types/product-detail.ts`

- [ ] **Step 1: Add `id` to `ProductDetailImage` and `imageId` to `ProductDetailVariant`**

In `lib/types/product-detail.ts:1-13`, change:

```typescript
export type ProductDetailVariant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
};

export type ProductDetailImage = {
  url: string;
  alt: string | null;
  sortOrder: number;
};
```

to:

```typescript
export type ProductDetailVariant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  imageId: string | null;
};

export type ProductDetailImage = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: new errors only in files that construct these types (handled in Task 9 and Task 10) — not in this file itself.

- [ ] **Step 3: Commit**

```bash
git add lib/types/product-detail.ts
git commit -m "feat(types): add imageId/id to product detail variant and image types"
```

---

## Task 9: Public product detail data layer

**Files:**
- Modify: `lib/data/product-detail-page.ts`

- [ ] **Step 1: Add `id` to `ImageRow` and select it**

In `lib/data/product-detail-page.ts:33-38`, change:

```typescript
type ImageRow = {
  url: string;
  alt_text: string | null;
  sort_order: number | null;
  is_primary: boolean | null;
};
```

to:

```typescript
type ImageRow = {
  id: string;
  url: string;
  alt_text: string | null;
  sort_order: number | null;
  is_primary: boolean | null;
};
```

- [ ] **Step 2: Add `image_id` to `VariantRow`**

In `lib/data/product-detail-page.ts:39-47`, change:

```typescript
type VariantRow = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  reserved: number | null;
  is_active: boolean | null;
};
```

to:

```typescript
type VariantRow = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  reserved: number | null;
  is_active: boolean | null;
  image_id: string | null;
};
```

- [ ] **Step 3: Update the select string**

In `lib/data/product-detail-page.ts:71-84`, change:

```typescript
      .select(
        `id, brand_id, category_id, name, slug, description, base_price, sale_price, average_rating, review_count, total_sold, min_order_qty,
         brands:brand_id(name, slug),
         categories:category_id(name, slug),
         product_images(url, alt_text, sort_order, is_primary),
         product_variants(id, name, sku, price, stock, reserved, is_active),
         product_tags(tag)`,
      )
```

to:

```typescript
      .select(
        `id, brand_id, category_id, name, slug, description, base_price, sale_price, average_rating, review_count, total_sold, min_order_qty,
         brands:brand_id(name, slug),
         categories:category_id(name, slug),
         product_images(id, url, alt_text, sort_order, is_primary),
         product_variants(id, name, sku, price, stock, reserved, is_active, image_id),
         product_tags(tag)`,
      )
```

- [ ] **Step 4: Map `id` into `mapImages` and `imageId` into the variants mapping**

In `lib/data/product-detail-page.ts:55-64`, change:

```typescript
function mapImages(rows: ImageRow[] | null | undefined): ProductDetailImage[] {
  if (!rows?.length) return [];
  return [...rows]
    .map((r) => ({
      url: r.url,
      alt: r.alt_text,
      sortOrder: r.sort_order ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
```

to:

```typescript
function mapImages(rows: ImageRow[] | null | undefined): ProductDetailImage[] {
  if (!rows?.length) return [];
  return [...rows]
    .map((r) => ({
      id: r.id,
      url: r.url,
      alt: r.alt_text,
      sortOrder: r.sort_order ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
```

In `lib/data/product-detail-page.ts:95-101`, change:

```typescript
    const variants: ProductDetailVariant[] = variantRows.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: Number(v.price),
      stock: Math.max(0, v.stock - (v.reserved ?? 0)),
    }));
```

to:

```typescript
    const variants: ProductDetailVariant[] = variantRows.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: Number(v.price),
      stock: Math.max(0, v.stock - (v.reserved ?? 0)),
      imageId: v.image_id,
    }));
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: no errors referencing `product-detail-page.ts`

- [ ] **Step 6: Commit**

```bash
git add lib/data/product-detail-page.ts
git commit -m "feat(data): select and map variant image_id on the product detail page"
```

---

## Task 10: Switch the main image when a variant is clicked

**Files:**
- Modify: `components/store/product-detail-client.tsx`

- [ ] **Step 1: Add `id` to the no-image fallback**

In `product-detail-client.tsx:115`, change:

```typescript
  const images = product.images.length > 0 ? product.images : [{ url: "", alt: product.name, sortOrder: 0 }];
```

to:

```typescript
  const images = product.images.length > 0 ? product.images : [{ id: "", url: "", alt: product.name, sortOrder: 0 }];
```

(Required now that `ProductDetailImage` has a mandatory `id` field — without this the file won't compile.)

- [ ] **Step 2: Switch `imgIndex` on variant click**

In `product-detail-client.tsx:272-284`, change:

```tsx
                        {product.variants.map((v) => (
                          <ChoiceChip
                            key={v.id}
                            selected={v.id === variant?.id}
                            disabled={v.stock < 1}
                            onClick={() => {
                              setVariantId(v.id);
                              setQty((q) => clampQty(q));
                            }}
                          >
                            {v.name}
                          </ChoiceChip>
                        ))}
```

to:

```tsx
                        {product.variants.map((v) => (
                          <ChoiceChip
                            key={v.id}
                            selected={v.id === variant?.id}
                            disabled={v.stock < 1}
                            onClick={() => {
                              setVariantId(v.id);
                              setQty((q) => clampQty(q));
                              const targetIndex = images.findIndex((img) => img.id === v.imageId);
                              if (targetIndex !== -1) setImgIndex(targetIndex);
                            }}
                          >
                            {v.name}
                          </ChoiceChip>
                        ))}
```

This reuses the existing `setImgIndex` state — the thumbnail strip (`product-detail-client.tsx:234-256`) already highlights whichever index `imgIndex` points to, so no extra UI work is needed there.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: no errors referencing `product-detail-client.tsx`

- [ ] **Step 4: Commit**

```bash
git add components/store/product-detail-client.tsx
git commit -m "feat(store): switch main product image when a variant is selected"
```

---

## Task 11: Manual QA pass

No automated tests exist in this repo. Run through this checklist by hand against a dev/preview deployment after all prior tasks are committed.

- [ ] **Step 1: Lint + build check**

Run: `npm run lint && npm run build`
Expected: exit 0, no new errors/warnings introduced by the files touched in this plan.

- [ ] **Step 2: Admin — new product, missing variant photo blocked**

Go to `/admin/products/new`, fill required fields, upload at least 1 product image, leave a variant's photo unset, submit.
Expected: inline validation error "Foto varian wajib diisi" under that variant, form does not submit.

- [ ] **Step 3: Admin — pick from gallery**

On the same form, click "Pilih dari Galeri" on a variant, choose one of the uploaded photos.
Expected: the variant's thumbnail updates immediately; the popover closes.

- [ ] **Step 4: Admin — upload new photo from variant card**

Click "Upload Baru" on a different variant, pick a local image file.
Expected: the new photo appears in the main "Gambar Produk" gallery section AND is auto-assigned to that variant's thumbnail.

- [ ] **Step 5: Admin — autofill from Variant 1**

Fill Variant 1 completely (price, stock, weight, dimensions, photo). Click "Tambah Varian".
Expected: the new Varian 2 row has price/stock/weight/length/width/height/is_active pre-filled identical to Variant 1; name, SKU, and photo are blank.

- [ ] **Step 6: Admin — autofill always from Variant 1, not the last-edited variant**

Edit Varian 2's price to a different value, then click "Tambah Varian" again to create Varian 3.
Expected: Varian 3's price matches Varian 1's original price, not Varian 2's edited price.

- [ ] **Step 7: Admin — save and re-open in edit mode**

Submit the product from Steps 2-6. Open it again via `/admin/products/[id]/edit`.
Expected: each variant's photo thumbnail shows the same image that was assigned during creation.

- [ ] **Step 8: Public page — variant click switches main photo**

Open the product's public page (`/products/[slug]`) where it has 2+ variants with different photos. Click each variant chip in turn.
Expected: the main image and the highlighted thumbnail both switch to that variant's photo each time.

- [ ] **Step 9: Public page — pre-existing product with backfilled image still works**

Open a product that existed before this migration (its variants were backfilled to the product's primary image in Task 1).
Expected: page loads normally, clicking variants switches to the (shared) primary image without errors.

---

## Self-Review Checklist

- [x] DB column `image_id` FK to `product_images`, `ON DELETE SET NULL`, backfilled for existing data ✅ (Task 1)
- [x] Generated types updated so no `any` casts needed for `image_id` ✅ (Task 2)
- [x] Admin: pick from existing gallery ✅ (Task 4, 5)
- [x] Admin: upload new image directly from variant card, auto-added to gallery ✅ (Task 4, 5)
- [x] Variant photo required (Zod `min(1)`), enforced before submit ✅ (Task 5 Step 1)
- [x] Server resolves `image_url` → `image_id`, fails loudly if unresolved (no silent null) ✅ (Task 6)
- [x] Images inserted before variants in both create and update so the FK can resolve ✅ (Task 6)
- [x] Edit page round-trips `image_id` back to `image_url` for the form ✅ (Task 7)
- [x] New variant autofills price/stock/weight/dimensions/is_active always from Variant 1 (`variants.0`), never from the last-edited variant ✅ (Task 5 Step 5)
- [x] Name, SKU, photo always blank on a new variant ✅ (Task 5 Step 5)
- [x] Public page: clicking a variant switches the main image via existing `imgIndex` state, no new state introduced ✅ (Task 10)
- [x] Public page: thumbnail strip auto-highlights the active image (reuses existing `safeImgIndex` logic, no changes needed there) ✅ (Task 10, confirmed no edit required)
- [x] Type consistency: `image_url` (form/client/server-action layer, keyed by URL) vs `image_id` (DB/public-read layer, keyed by UUID) used consistently across all 11 tasks — `image_url` never appears in `types/supabase.ts` or `product-detail-page.ts`; `image_id` never appears in `product-form.tsx` or `variant-image-picker.tsx` ✅
- [x] No placeholders — every step shows the actual before/after code ✅
