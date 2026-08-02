# Komplain & Retur — Flow Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the already-built return/exchange flow (approve → ship back → admin receives → replacement shipment) actually reachable, let admin override the buyer's initial request, and let the buyer attach photo proof when shipping the item back.

**Architecture:** No new subsystem. This completes wiring on the existing `2026-06-24-complaint-return-design.md` architecture — `complaints`/`returns`/`return_shipments` tables, `ReturnManager`/`ReturnAwbForm` components, and `approveReturn`/`confirmReturnReceived`/`createReplacementShipment` actions all already exist and already work. The one structural gap: `complaints.type` is hardcoded to `"product"` at insert time, so the `complaint.type === "return"` render gate in `complaint-detail.tsx` never opens and `<ReturnManager>` (which holds the "Setujui Retur" button) never renders.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (Postgres + Storage), TypeScript, Biteship.

## Global Constraints

- No test framework exists for UI/Server Action code in this repo (`package.json` only has `test:midtrans`, node's built-in `--test` runner for pure Midtrans signature logic — no jest/vitest/RTL/playwright). Verification per task = `npx tsc --noEmit` + `npx eslint <changed files>` + a manual QA description. This matches how every prior task in this codebase's session history was verified — don't introduce a new test framework for this.
- Reuse `/api/complaint-upload` + `uploadComplaintMedia()` exactly as-is for return proof photos — no new upload route.
- Refund is out of scope everywhere in this plan — handled by the separate cancel-order flow, not offered as a choice here.
- Spec: `docs/superpowers/specs/2026-07-23-complaint-return-flow-fix-design.md`.
- Supabase project: `xvgcmqpnrloqbneacdpx` (only one active project — dev and prod share it).

---

### Task 1: `returns.proof_images` column

**Files:**
- Create: `supabase/migrations/033_return_proof_images.sql`
- Modify: `types/supabase.ts:1495-1531` (`returns` table Row/Insert/Update)

**Interfaces:**
- Produces: `returns.proof_images` (Postgres `jsonb`, TS `Json`, default `[]`, not null) — consumed by Task 4.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/033_return_proof_images.sql
ALTER TABLE returns ADD COLUMN IF NOT EXISTS proof_images jsonb NOT NULL DEFAULT '[]';
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool:
- `project_id`: `xvgcmqpnrloqbneacdpx`
- `name`: `return_proof_images`
- `query`: the SQL from Step 1

- [ ] **Step 3: Verify the column exists**

Use the Supabase MCP `execute_sql` tool:
```sql
select column_name, data_type, column_default from information_schema.columns where table_name = 'returns' and column_name = 'proof_images';
```
Expected: one row, `data_type = jsonb`, `column_default = '[]'::jsonb`.

- [ ] **Step 4: Update generated types**

In `types/supabase.ts`, the `returns` table block currently reads (around line 1495):

```ts
      returns: {
        Row: {
          admin_note: string | null
          complaint_id: string
          created_at: string
          id: string
          order_id: string
          return_awb: string | null
          return_courier: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          complaint_id: string
          created_at?: string
          id?: string
          order_id: string
          return_awb?: string | null
          return_courier?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          complaint_id?: string
          created_at?: string
          id?: string
          order_id?: string
          return_awb?: string | null
          return_courier?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
```

Change to (add `proof_images` to all three, alphabetically after `order_id`):

```ts
      returns: {
        Row: {
          admin_note: string | null
          complaint_id: string
          created_at: string
          id: string
          order_id: string
          proof_images: Json
          return_awb: string | null
          return_courier: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          complaint_id: string
          created_at?: string
          id?: string
          order_id: string
          proof_images?: Json
          return_awb?: string | null
          return_courier?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          complaint_id?: string
          created_at?: string
          id?: string
          order_id?: string
          proof_images?: Json
          return_awb?: string | null
          return_courier?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
```

- [ ] **Step 5: Verify types**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/033_return_proof_images.sql types/supabase.ts
git commit -m "feat: add returns.proof_images column"
```

---

### Task 2: Buyer resolution-intent choice at complaint submission

**Files:**
- Modify: `components/dashboard/order-complaint-form.tsx`
- Modify: `app/(dashboard)/dashboard/orders/_actions.ts` (`submitComplaintAction`, currently lines 364-449)

**Interfaces:**
- Consumes: none new.
- Produces: `submitComplaintAction(input: { orderId, category, reason, description, mediaUrls, type })` — `type: "product" | "return"`. Task 3 reads `complaint.type` from the DB, no direct code dependency on this signature.

- [ ] **Step 1: Add the resolution-intent radio group to the form**

In `components/dashboard/order-complaint-form.tsx`, add state near the top of the component (after `const [category, setCategory] = useState("");`):

```tsx
  const [resolutionType, setResolutionType] = useState<"product" | "return">("product");
```

Add the radio group JSX right after the "Kategori masalah" block (after its closing `</div>`, before the "Ringkasan masalah" block):

```tsx
      <div>
        <Label className="text-xs font-semibold uppercase text-[#7a7a7a]">
          Apa yang kamu inginkan?
        </Label>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-sm text-[#1d1d1f]">
            <input
              type="radio"
              name="resolutionType"
              value="return"
              checked={resolutionType === "return"}
              onChange={() => setResolutionType("return")}
            />
            Tukar / kembalikan barang
          </label>
          <label className="flex items-center gap-2 text-sm text-[#1d1d1f]">
            <input
              type="radio"
              name="resolutionType"
              value="product"
              checked={resolutionType === "product"}
              onChange={() => setResolutionType("product")}
            />
            Lainnya (tanpa tukar barang)
          </label>
        </div>
      </div>
```

Pass it through in the submit handler — find:

```tsx
          const res = await submitComplaintAction({
            orderId,
            category,
            reason,
            description: description.trim() || null,
            mediaUrls,
          });
```

Change to:

```tsx
          const res = await submitComplaintAction({
            orderId,
            category,
            reason,
            description: description.trim() || null,
            mediaUrls,
            type: resolutionType,
          });
```

- [ ] **Step 2: Accept and store `type` in the server action**

In `app/(dashboard)/dashboard/orders/_actions.ts`, find `submitComplaintAction`'s signature:

```ts
export async function submitComplaintAction(input: {
  orderId: string;
  category: string;
  reason: string;
  description: string | null;
  mediaUrls: string[];
}): Promise<{ success: boolean; error?: string }> {
```

Change to:

```ts
export async function submitComplaintAction(input: {
  orderId: string;
  category: string;
  reason: string;
  description: string | null;
  mediaUrls: string[];
  type: "product" | "return";
}): Promise<{ success: boolean; error?: string }> {
```

Find the category validation block:

```ts
  const VALID_CATEGORIES = [
    "wrong_item",
    "damaged",
    "missing_item",
    "not_as_described",
    "other",
  ];
  if (!VALID_CATEGORIES.includes(input.category)) {
    return { success: false, error: "Kategori tidak valid." };
  }
```

Add a `type` validation right after it:

```ts
  const VALID_CATEGORIES = [
    "wrong_item",
    "damaged",
    "missing_item",
    "not_as_described",
    "other",
  ];
  if (!VALID_CATEGORIES.includes(input.category)) {
    return { success: false, error: "Kategori tidak valid." };
  }
  if (input.type !== "product" && input.type !== "return") {
    return { success: false, error: "Tipe komplain tidak valid." };
  }
```

Find the insert call:

```ts
  const { error } = await supabase.from("complaints").insert({
    order_id: input.orderId,
    user_id: user.id,
    type: "product",
    category: input.category,
    reason: input.reason.trim(),
    description: input.description,
    images: input.mediaUrls,
    status: "open",
  });
```

Change `type: "product"` to `type: input.type`:

```ts
  const { error } = await supabase.from("complaints").insert({
    order_id: input.orderId,
    user_id: user.id,
    type: input.type,
    category: input.category,
    reason: input.reason.trim(),
    description: input.description,
    images: input.mediaUrls,
    status: "open",
  });
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npx eslint components/dashboard/order-complaint-form.tsx "app/(dashboard)/dashboard/orders/_actions.ts"`
Expected: no new errors (pre-existing warnings in `_actions.ts` unrelated to this change are fine).

- [ ] **Step 4: Manual QA**

Start the dev server, log in as a test user with a `delivered` order, open `/dashboard/orders/[id]/complaint`, fill the form choosing "Tukar / kembalikan barang", submit. Confirm no client error. (Full DB confirmation of `type` happens naturally once Task 3's admin view shows the label.)

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/order-complaint-form.tsx "app/(dashboard)/dashboard/orders/_actions.ts"
git commit -m "feat: let buyer choose exchange vs other resolution when filing a complaint"
```

---

### Task 3: Un-gate `ReturnManager` + show buyer's request as a hint (admin)

**Files:**
- Modify: `app/admin/(panel)/complaints/[id]/_components/complaint-detail.tsx`

**Interfaces:**
- Consumes: `complaint.type` (`"product" | "return"`, from Task 2), `complaint.status`, `complaint.returns`.
- Produces: none new — this only changes render conditions in an existing component.

- [ ] **Step 1: Add a type label map and use it for the "Tipe" field**

Find the constant block near the top of the file (after `const labelClass = ...;`):

```ts
const labelClass = "text-[11px] font-semibold uppercase text-muted-foreground";
```

Add right after it:

```ts
const RESOLUTION_TYPE_LABEL: Record<string, string> = {
  return: "Tukar barang",
  product: "Lainnya",
};
```

Find the "Tipe" field in the "Informasi Komplain" card:

```tsx
                <div>
                  <p className={cn(labelClass, "mb-1")}>Tipe</p>
                  <p className="capitalize">{complaint.type.replace(/_/g, " ")}</p>
                </div>
```

Change to:

```tsx
                <div>
                  <p className={cn(labelClass, "mb-1")}>Permintaan Pembeli</p>
                  <p className="capitalize">{RESOLUTION_TYPE_LABEL[complaint.type] ?? complaint.type}</p>
                </div>
```

- [ ] **Step 2: Un-gate the Retur card**

Find:

```tsx
          {complaint.type === "return" && (
            <div className="admin-utility-card overflow-hidden p-0">
              <div className="admin-utility-card-header">
                <h2 className="admin-section-title">Retur</h2>
              </div>
```

Change the condition to show whenever admin could still approve a return (`in_review`) or a return is already underway (`complaint.returns` exists — this is set once `approveReturn` runs, and stays true through `shipped_back`/`received`/`replacement_sent`):

```tsx
          {(complaint.status === "in_review" || complaint.returns) && (
            <div className="admin-utility-card overflow-hidden p-0">
              <div className="admin-utility-card-header">
                <h2 className="admin-section-title">Retur</h2>
              </div>
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npx eslint "app/admin/(panel)/complaints/[id]/_components/complaint-detail.tsx"`
Expected: no new errors.

- [ ] **Step 4: Manual QA**

Open `/admin/complaints/[id]` for a complaint at `in_review` status (any `type`). Confirm the "Retur" card with "Setujui Retur" now renders regardless of the "Permintaan Pembeli" label shown above it. Click "Setujui Retur", confirm it still works (calls existing `approveReturn` unchanged) and the card keeps rendering afterward (now gated by `complaint.returns` instead of `type`).

- [ ] **Step 5: Commit**

```bash
git add "app/admin/(panel)/complaints/[id]/_components/complaint-detail.tsx"
git commit -m "fix: un-gate return approval from complaint.type so it's actually reachable"
```

---

### Task 4: Photo proof upload when shipping the item back

**Files:**
- Modify: `components/dashboard/return-awb-form.tsx`
- Modify: `app/(dashboard)/dashboard/orders/_actions.ts` (`submitReturnAWBAction`, currently lines 563-595)
- Modify: `app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx` (pass new `orderId` prop)
- Modify: `lib/data/complaints.ts` (`ReturnDetail` type + query)
- Modify: `app/admin/(panel)/complaints/[id]/_components/return-manager.tsx` (display proof photos)
- Modify: `app/admin/(panel)/complaints/[id]/_components/complaint-detail.tsx` (`ComplaintDetail.returns` type)
- Modify: `app/admin/(panel)/complaints/[id]/page.tsx` (select `proof_images`)

**Interfaces:**
- Consumes: `returns.proof_images` (Task 1), `/api/complaint-upload` (existing, unchanged — takes `file` + `orderId` form fields, returns `{ url }`).
- Produces: `submitReturnAWBAction(returnId, returnAwb, returnCourier, proofImages: string[])`.

- [ ] **Step 1: Add upload UI to `ReturnAwbForm`**

Replace the full contents of `components/dashboard/return-awb-form.tsx` with:

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitReturnAWBAction } from "@/app/(dashboard)/dashboard/orders/_actions";

const MAX_FILES = 5;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

export function ReturnAwbForm({ returnId, orderId }: { returnId: string; orderId: string }) {
  const [courier, setCourier] = useState("");
  const [awb, setAwb] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    const remaining = MAX_FILES - mediaUrls.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    const results = await Promise.all(
      toUpload.map(async (file) => {
        if (!ALLOWED_MIME.includes(file.type)) {
          toast.error(`${file.name}: format tidak didukung.`);
          return null;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("orderId", orderId);
        const res = await fetch("/api/complaint-upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Upload gagal.");
          return null;
        }
        return json.url as string;
      }),
    );
    setUploading(false);
    setMediaUrls((prev) => [...prev, ...(results.filter(Boolean) as string[])]);
  }

  function removeMedia(url: string) {
    setMediaUrls((prev) => prev.filter((u) => u !== url));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!courier.trim() || !awb.trim()) return;
    startTransition(async () => {
      const res = await submitReturnAWBAction(returnId, awb, courier, mediaUrls);
      if (res.success) {
        toast.success("Resi berhasil dikirim. Menunggu konfirmasi dari tim GeekyTech.");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label className="text-xs font-semibold uppercase text-[#7a7a7a]">Nama kurir</Label>
        <Input
          value={courier}
          onChange={(e) => setCourier(e.target.value)}
          required
          placeholder="Contoh: JNE, J&T, SiCepat"
          className="mt-1 border-[#e0e0e0]"
        />
      </div>
      <div>
        <Label className="text-xs font-semibold uppercase text-[#7a7a7a]">Nomor resi</Label>
        <Input
          value={awb}
          onChange={(e) => setAwb(e.target.value)}
          required
          placeholder="Masukkan nomor resi pengiriman"
          className="mt-1 border-[#e0e0e0]"
        />
      </div>
      <div>
        <Label className="text-xs font-semibold uppercase text-[#7a7a7a]">
          Foto bukti pengiriman (maks {MAX_FILES})
        </Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {mediaUrls.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#e0e0e0]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="bukti" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeMedia(url)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {mediaUrls.length < MAX_FILES && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[#c0c0c0] bg-[#fafafa] text-[#a0a0a0] hover:border-[#EA5329] hover:text-[#EA5329] disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              <span className="text-[10px]">{uploading ? "Upload..." : "Tambah"}</span>
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>
      <Button type="submit" variant="primary" loading={pending} disabled={uploading}>
        Konfirmasi Sudah Kirim
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Accept + store `proofImages` in the server action**

In `app/(dashboard)/dashboard/orders/_actions.ts`, find `submitReturnAWBAction`:

```ts
export async function submitReturnAWBAction(
  returnId: string,
  returnAwb: string,
  returnCourier: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Tidak terautentikasi." };

  const { data: ret } = await supabase
    .from("returns")
    .select("id, status")
    .eq("id", returnId)
    .eq("user_id", user.id)
    .single();

  if (!ret || ret.status !== "pending_shipback") {
    return { success: false, error: "Pengajuan retur tidak ditemukan atau sudah diproses." };
  }

  const { error } = await supabase
    .from("returns")
    .update({
      return_awb: returnAwb.trim(),
      return_courier: returnCourier.trim(),
      status: "shipped_back",
      updated_at: new Date().toISOString(),
    })
    .eq("id", returnId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
```

Change to:

```ts
export async function submitReturnAWBAction(
  returnId: string,
  returnAwb: string,
  returnCourier: string,
  proofImages: string[],
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Tidak terautentikasi." };

  const { data: ret } = await supabase
    .from("returns")
    .select("id, status")
    .eq("id", returnId)
    .eq("user_id", user.id)
    .single();

  if (!ret || ret.status !== "pending_shipback") {
    return { success: false, error: "Pengajuan retur tidak ditemukan atau sudah diproses." };
  }

  const { error } = await supabase
    .from("returns")
    .update({
      return_awb: returnAwb.trim(),
      return_courier: returnCourier.trim(),
      proof_images: proofImages,
      status: "shipped_back",
      updated_at: new Date().toISOString(),
    })
    .eq("id", returnId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
```

- [ ] **Step 3: Pass `orderId` from the complaint page**

In `app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx`, find:

```tsx
          <ReturnAwbForm returnId={ret.id} />
```

Change to:

```tsx
          <ReturnAwbForm returnId={ret.id} orderId={detail.order.id} />
```

- [ ] **Step 4: Select `proof_images` in the complaint/return query**

In `lib/data/complaints.ts`, find the `ReturnDetail` type:

```ts
export type ReturnDetail = {
  id: string;
  status: string;
  return_awb: string | null;
  return_courier: string | null;
  created_at: string;
  return_shipments: {
    id: string;
    awb_number: string | null;
    courier: string | null;
    status: string | null;
  }[];
};
```

Change to:

```ts
export type ReturnDetail = {
  id: string;
  status: string;
  return_awb: string | null;
  return_courier: string | null;
  proof_images: string[];
  created_at: string;
  return_shipments: {
    id: string;
    awb_number: string | null;
    courier: string | null;
    status: string | null;
  }[];
};
```

Find the returns query inside `fetchComplaintForOrder`:

```ts
    supabase
      .from("returns")
      .select("id, status, return_awb, return_courier, created_at, return_shipments(id, awb_number, courier, status)")
      .eq("complaint_id", complaint.id)
      .maybeSingle(),
```

Change to:

```ts
    supabase
      .from("returns")
      .select("id, status, return_awb, return_courier, proof_images, created_at, return_shipments(id, awb_number, courier, status)")
      .eq("complaint_id", complaint.id)
      .maybeSingle(),
```

Find the return mapping in the function's return statement:

```ts
    return: returnRes.data
      ? {
          ...returnRes.data,
          return_shipments: Array.isArray((returnRes.data as any).return_shipments)
            ? (returnRes.data as any).return_shipments
            : [],
        }
      : null,
```

Change to normalize `proof_images` the same way `images` is normalized earlier in the file:

```ts
    return: returnRes.data
      ? {
          ...returnRes.data,
          proof_images: Array.isArray(returnRes.data.proof_images)
            ? (returnRes.data.proof_images as string[])
            : [],
          return_shipments: Array.isArray((returnRes.data as any).return_shipments)
            ? (returnRes.data as any).return_shipments
            : [],
        }
      : null,
```

- [ ] **Step 5: Select `proof_images` in the admin query + update its type**

In `app/admin/(panel)/complaints/[id]/page.tsx`, find:

```
       returns(id, status, return_awb, return_courier, created_at, updated_at, return_shipments(id, awb_number, courier, status))`
```

Change to:

```
       returns(id, status, return_awb, return_courier, proof_images, created_at, updated_at, return_shipments(id, awb_number, courier, status))`
```

In `app/admin/(panel)/complaints/[id]/_components/complaint-detail.tsx`, find the `returns` field in `ComplaintDetail`:

```ts
  returns: {
    id: string;
    status: string;
    return_awb: string | null;
    return_courier: string | null;
    return_shipments: {
      awb_number: string | null;
      courier: string | null;
      status: string | null;
    }[];
  } | null;
```

Change to:

```ts
  returns: {
    id: string;
    status: string;
    return_awb: string | null;
    return_courier: string | null;
    proof_images: string[];
    return_shipments: {
      awb_number: string | null;
      courier: string | null;
      status: string | null;
    }[];
  } | null;
```

- [ ] **Step 6: Display proof photos in `ReturnManager`**

In `app/admin/(panel)/complaints/[id]/_components/return-manager.tsx`, add `import Image from "next/image";` to the imports, then find the `ReturnData` type:

```ts
type ReturnData = {
  id: string;
  status: string;
  return_awb: string | null;
  return_courier: string | null;
  return_shipments: { awb_number: string | null; courier: string | null; status: string | null }[];
};
```

Change to:

```ts
type ReturnData = {
  id: string;
  status: string;
  return_awb: string | null;
  return_courier: string | null;
  proof_images: string[];
  return_shipments: { awb_number: string | null; courier: string | null; status: string | null }[];
};
```

Find the "Resi dari pembeli" block:

```tsx
          {returnData.return_awb && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Resi dari pembeli</p>
              <p>{returnData.return_courier}</p>
              <p className="font-mono font-semibold">{returnData.return_awb}</p>
            </div>
          )}
```

Add the photo grid right after its closing `</div>`, still inside the same conditional:

```tsx
          {returnData.return_awb && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Resi dari pembeli</p>
              <p>{returnData.return_courier}</p>
              <p className="font-mono font-semibold">{returnData.return_awb}</p>
              {returnData.proof_images.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {returnData.proof_images.map((url, i) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square overflow-hidden rounded-lg border border-[#e0e0e0]"
                    >
                      <Image src={url} alt={`Bukti kirim ${i + 1}`} fill sizes="80px" className="object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
```

- [ ] **Step 7: Verify types and lint**

Run: `npx tsc --noEmit`
Expected: no output.

Run:
```bash
npx eslint components/dashboard/return-awb-form.tsx "app/(dashboard)/dashboard/orders/_actions.ts" "app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx" lib/data/complaints.ts "app/admin/(panel)/complaints/[id]/_components/return-manager.tsx" "app/admin/(panel)/complaints/[id]/_components/complaint-detail.tsx" "app/admin/(panel)/complaints/[id]/page.tsx"
```
Expected: no new errors.

- [ ] **Step 8: Manual QA**

As a user with an approved return at `pending_shipback`, open the complaint page, fill courier + AWB + attach 1-2 photos, submit. As admin, open the same complaint — confirm the AWB block now shows the photos as clickable thumbnails next to the courier/AWB text.

- [ ] **Step 9: Commit**

```bash
git add components/dashboard/return-awb-form.tsx "app/(dashboard)/dashboard/orders/_actions.ts" "app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx" lib/data/complaints.ts "app/admin/(panel)/complaints/[id]/_components/return-manager.tsx" "app/admin/(panel)/complaints/[id]/_components/complaint-detail.tsx" "app/admin/(panel)/complaints/[id]/page.tsx"
git commit -m "feat: let buyer attach photo proof when shipping a return back"
```
