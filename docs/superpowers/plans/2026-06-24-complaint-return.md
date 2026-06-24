# Complaint & Return System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade complaint system with category dropdown + media upload, inline chat thread, and a full product-replacement return flow (user ships back → admin confirms → admin sends replacement via Biteship). Orders auto-complete 3 days after delivery.

**Architecture:** Complaints remain the entry point. Three new tables: `complaint_messages` (inline thread), `returns` (return lifecycle), `return_shipments` (Biteship replacement order). `complaints.category` column added. Cron endpoint auto-moves `delivered` orders to `completed` after 3 days. All admin operations use service role; user operations use RLS-filtered client.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + Storage), `createBiteshipOrder` from `lib/biteship/create-order.ts`, `createNotification` from `lib/notifications/create-notification.ts`

---

### Task 1: DB Migrations

**Files:**
- Run SQL in Supabase SQL editor (4 migrations)

- [ ] **Migration 1 — add `category` to complaints**

```sql
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';
```

- [ ] **Migration 2 — create `complaint_messages`**

```sql
CREATE TABLE complaint_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  sender_id    uuid NOT NULL,
  sender_role  text NOT NULL CHECK (sender_role IN ('user', 'admin')),
  message      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE complaint_messages ENABLE ROW LEVEL SECURITY;

-- User: read + insert on their own complaints only
CREATE POLICY "user_complaint_messages" ON complaint_messages
  USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = complaint_messages.complaint_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_role = 'user' AND
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = complaint_messages.complaint_id
        AND c.user_id = auth.uid()
    )
  );
```

- [ ] **Migration 3 — create `returns`**

```sql
CREATE TABLE returns (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id   uuid NOT NULL REFERENCES complaints(id),
  order_id       uuid NOT NULL REFERENCES orders(id),
  user_id        uuid NOT NULL REFERENCES profiles(id),
  status         text NOT NULL DEFAULT 'pending_shipback'
                 CHECK (status IN ('pending_shipback','shipped_back','received','replacement_sent','completed')),
  return_awb     text,
  return_courier text,
  admin_note     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_returns_read" ON returns
  FOR SELECT USING (user_id = auth.uid());
```

- [ ] **Migration 4 — create `return_shipments`**

```sql
CREATE TABLE return_shipments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id         uuid NOT NULL REFERENCES returns(id),
  biteship_order_id text,
  awb_number        text,
  courier           text,
  status            text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE return_shipments ENABLE ROW LEVEL SECURITY;

-- User: read only via their return
CREATE POLICY "user_return_shipments_read" ON return_shipments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM returns r
      WHERE r.id = return_shipments.return_id
        AND r.user_id = auth.uid()
    )
  );
```

- [ ] **Regenerate Supabase types**

```bash
npx supabase gen types typescript --project-id <your-project-ref> > types/supabase.ts
```

- [ ] **Commit**

```bash
git add types/supabase.ts
git commit -m "feat(db): add complaint_messages, returns, return_shipments tables; add complaints.category"
```

---

### Task 2: Media Upload Helper

**Files:**
- Create: `lib/supabase/upload-complaint-media.ts`

- [ ] **Create bucket `complaint-images` in Supabase Storage** (Dashboard → Storage → New bucket, public=true)

- [ ] **Create upload helper**

```typescript
// lib/supabase/upload-complaint-media.ts
import { createClient } from "@/lib/supabase/server";

const BUCKET = "complaint-images";
const MAX_SIZE_MB = 50;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];

export async function uploadComplaintMedia(
  file: File,
  orderId: string,
): Promise<{ url: string } | { error: string }> {
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { error: `File terlalu besar (maks ${MAX_SIZE_MB} MB).` };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Format tidak didukung. Gunakan JPG, PNG, atau MP4/MOV." };
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
```

- [ ] **Commit**

```bash
git add lib/supabase/upload-complaint-media.ts
git commit -m "feat(storage): add complaint media upload helper"
```

---

### Task 3: Data Fetch Helpers

**Files:**
- Create: `lib/data/complaints.ts`

- [ ] **Create helpers**

```typescript
// lib/data/complaints.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export type ComplaintMessage = {
  id: string;
  sender_id: string;
  sender_role: "user" | "admin";
  message: string;
  created_at: string;
};

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

export type ComplaintWithThread = {
  id: string;
  category: string;
  reason: string;
  description: string | null;
  status: string;
  images: string[];
  created_at: string;
  messages: ComplaintMessage[];
  return: ReturnDetail | null;
};

/** Fetch complaint + messages + return for a given order (user-scoped). */
export async function fetchComplaintForOrder(
  orderId: string,
): Promise<ComplaintWithThread | null> {
  const supabase = await createClient();

  const { data: complaint } = await supabase
    .from("complaints")
    .select("id, category, reason, description, status, images, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!complaint) return null;

  const [msgRes, returnRes] = await Promise.all([
    supabase
      .from("complaint_messages")
      .select("id, sender_id, sender_role, message, created_at")
      .eq("complaint_id", complaint.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("returns")
      .select("id, status, return_awb, return_courier, created_at, return_shipments(id, awb_number, courier, status)")
      .eq("complaint_id", complaint.id)
      .maybeSingle(),
  ]);

  return {
    ...complaint,
    images: Array.isArray(complaint.images) ? (complaint.images as string[]) : [],
    messages: (msgRes.data ?? []) as ComplaintMessage[],
    return: returnRes.data
      ? {
          ...returnRes.data,
          return_shipments: Array.isArray((returnRes.data as any).return_shipments)
            ? (returnRes.data as any).return_shipments
            : [],
        }
      : null,
  };
}
```

- [ ] **Commit**

```bash
git add lib/data/complaints.ts
git commit -m "feat(data): add fetchComplaintForOrder helper with messages and return"
```

---

### Task 4: Upgrade Complaint Form

**Files:**
- Modify: `components/dashboard/order-complaint-form.tsx`

The form needs: category dropdown, media upload (up to 5 files), and existing reason + description fields. Media is uploaded client-side before form submit via a dedicated API route.

- [ ] **Create upload API route** `app/api/complaint-upload/route.ts`

```typescript
// app/api/complaint-upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadComplaintMedia } from "@/lib/supabase/upload-complaint-media";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const orderId = formData.get("orderId") as string | null;

  if (!file || !orderId) return NextResponse.json({ error: "Missing file or orderId" }, { status: 400 });

  const result = await uploadComplaintMedia(file, orderId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ url: result.url });
}
```

- [ ] **Replace `components/dashboard/order-complaint-form.tsx`**

```typescript
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Upload, Image as ImageIcon, Video, Loader2 } from "lucide-react";
import { submitComplaintAction } from "@/app/(dashboard)/dashboard/orders/_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  { value: "wrong_item",       label: "Barang tidak sesuai pesanan" },
  { value: "damaged",          label: "Barang rusak / cacat" },
  { value: "missing_item",     label: "Barang kurang / tidak lengkap" },
  { value: "not_as_described", label: "Tidak sesuai deskripsi" },
  { value: "other",            label: "Lainnya" },
];

const MAX_FILES = 5;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];

export function OrderComplaintForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
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
        if (!res.ok) { toast.error(json.error ?? "Upload gagal."); return null; }
        return json.url as string;
      })
    );
    setUploading(false);
    setMediaUrls((prev) => [...prev, ...(results.filter(Boolean) as string[])]);
  }

  function removeMedia(url: string) {
    setMediaUrls((prev) => prev.filter((u) => u !== url));
  }

  function isVideo(url: string) {
    return /\.(mp4|mov|webm)$/i.test(url);
  }

  return (
    <form
      className="rounded-xl border border-[#e0e0e0] bg-white p-5 sm:p-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!category) { toast.error("Pilih kategori masalah."); return; }
        const fd = new FormData(e.currentTarget);
        const reason = String(fd.get("reason") ?? "");
        const description = String(fd.get("description") ?? "");
        startTransition(async () => {
          const res = await submitComplaintAction({
            orderId,
            category,
            reason,
            description: description.trim() || null,
            mediaUrls,
          });
          if (res.success) {
            toast.success("Komplain diajukan. Tim kami akan meninjau.");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        });
      }}
    >
      <div>
        <Label className="text-xs font-semibold uppercase text-[#7a7a7a]">Kategori masalah</Label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger className="mt-1 border-[#e0e0e0]">
            <SelectValue placeholder="Pilih kategori..." />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="reason" className="text-xs font-semibold uppercase text-[#7a7a7a]">
          Ringkasan masalah
        </Label>
        <Input id="reason" name="reason" required minLength={3} className="mt-1 border-[#e0e0e0]" placeholder="Contoh: Barang cacat / salah kirim" />
      </div>

      <div>
        <Label htmlFor="description" className="text-xs font-semibold uppercase text-[#7a7a7a]">
          Detail (opsional)
        </Label>
        <Textarea id="description" name="description" rows={4} className="mt-1 border-[#e0e0e0]" placeholder="Jelaskan kejadian secara detail." />
      </div>

      <div>
        <Label className="text-xs font-semibold uppercase text-[#7a7a7a]">
          Foto / Video bukti (maks {MAX_FILES} file)
        </Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {mediaUrls.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#e0e0e0]">
              {isVideo(url) ? (
                <div className="flex h-full w-full items-center justify-center bg-[#f5f5f7]">
                  <Video className="h-6 w-6 text-[#a0a0a0]" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="bukti" className="h-full w-full object-cover" />
              )}
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
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#c0c0c0] bg-[#fafafa] text-[#a0a0a0] hover:border-[#EA5329] hover:text-[#EA5329] disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              <span className="text-[10px]">{uploading ? "Upload..." : "Tambah"}</span>
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      <Button type="submit" variant="primary" loading={pending} disabled={uploading} className="mt-2">
        Ajukan komplain
      </Button>
    </form>
  );
}
```

- [ ] **Commit**

```bash
git add components/dashboard/order-complaint-form.tsx app/api/complaint-upload/route.ts
git commit -m "feat(complaint): add category dropdown and media upload to complaint form"
```

---

### Task 5: Update `submitComplaintAction` — category + media URLs + 3-day gate

**Files:**
- Modify: `app/(dashboard)/dashboard/orders/_actions.ts`

Find `submitComplaintAction` and update its signature and implementation.

- [ ] **Update the action**

Replace the existing `submitComplaintAction` with:

```typescript
export async function submitComplaintAction(input: {
  orderId: string;
  category: string;
  reason: string;
  description: string | null;
  mediaUrls: string[];
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Tidak terautentikasi." };

  // 3-day gate
  const { data: order } = await supabase
    .from("orders")
    .select("id, status, delivered_at")
    .eq("id", input.orderId)
    .eq("user_id", user.id)
    .single();

  if (!order) return { success: false, error: "Pesanan tidak ditemukan." };
  if (order.status === "completed") {
    return { success: false, error: "Batas waktu komplain (3 hari setelah diterima) telah berakhir." };
  }
  if (order.status !== "delivered") {
    return { success: false, error: "Komplain hanya bisa diajukan setelah barang diterima." };
  }
  if (order.delivered_at) {
    const deadline = new Date(order.delivered_at).getTime() + 3 * 24 * 60 * 60 * 1000;
    if (Date.now() > deadline) {
      return { success: false, error: "Batas waktu komplain (3 hari setelah diterima) telah berakhir." };
    }
  }

  // Check no existing complaint
  const { data: existing } = await supabase
    .from("complaints")
    .select("id")
    .eq("order_id", input.orderId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return { success: false, error: "Komplain untuk pesanan ini sudah ada." };

  const VALID_CATEGORIES = ["wrong_item", "damaged", "missing_item", "not_as_described", "other"];
  if (!VALID_CATEGORIES.includes(input.category)) {
    return { success: false, error: "Kategori tidak valid." };
  }

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

  if (error) return { success: false, error: error.message };
  revalidatePath(`/dashboard/orders/${input.orderId}`);
  revalidatePath(`/dashboard/orders/${input.orderId}/complaint`);
  return { success: true };
}
```

- [ ] **Commit**

```bash
git add app/(dashboard)/dashboard/orders/_actions.ts
git commit -m "feat(complaint): add category, media, and 3-day deadline gate to submitComplaintAction"
```

---

### Task 6: Tracking Page — Complaint Deadline Banner

**Files:**
- Modify: `app/(dashboard)/dashboard/orders/[id]/tracking/page.tsx`

- [ ] **Add deadline banner** — insert before the outer `<div className="grid ...">` in the page return:

```typescript
// At the top of the page component, after fetching detail:
const deliveredAt = order.delivered_at ? new Date(order.delivered_at) : null;
const deadlineMs = deliveredAt ? deliveredAt.getTime() + 3 * 24 * 60 * 60 * 1000 : null;
const canComplain = order.status === "delivered" && deadlineMs && Date.now() < deadlineMs;
const hoursLeft = deadlineMs ? Math.max(0, Math.ceil((deadlineMs - Date.now()) / (1000 * 60 * 60))) : 0;
```

```tsx
{/* Complaint deadline banner — insert before the grid div */}
{canComplain && (
  <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
    <p className="text-[13px] leading-relaxed text-amber-900">
      Ada masalah dengan pesanan? Anda memiliki{" "}
      <span className="font-semibold">{hoursLeft} jam</span> lagi untuk{" "}
      <a href={`/dashboard/orders/${order.id}/complaint`} className="underline underline-offset-2">
        mengajukan komplain
      </a>
      .
    </p>
  </div>
)}
{order.status === "completed" && (
  <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#e0e0e0] bg-[#f5f5f7] px-4 py-3">
    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#a0a0a0]" />
    <p className="text-[13px] text-[#7a7a7a]">
      Batas waktu komplain untuk pesanan ini telah berakhir.
    </p>
  </div>
)}
```

- [ ] **Commit**

```bash
git add "app/(dashboard)/dashboard/orders/[id]/tracking/page.tsx"
git commit -m "feat(tracking): add complaint deadline banner"
```

---

### Task 7: Cron Endpoint — Auto-complete Delivered Orders

**Files:**
- Create: `app/api/cron/complete-delivered-orders/route.ts`

- [ ] **Add `CRON_SECRET` to `.env.local`**

```
CRON_SECRET=<random-string>
```

Also add to Vercel environment variables.

- [ ] **Create endpoint**

```typescript
// app/api/cron/complete-delivered-orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("status", "delivered")
    .lt("delivered_at", cutoff);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!orders || orders.length === 0) return NextResponse.json({ updated: 0 });

  const ids = orders.map((o) => o.id);
  await supabase.from("orders").update({ status: "completed" }).in("id", ids);

  // Insert order_status_history for each
  await supabase.from("order_status_history").insert(
    ids.map((id) => ({ order_id: id, status: "completed", note: "Auto-selesai 3 hari setelah diterima", changed_by: null }))
  );

  console.log(`[cron] Auto-completed ${ids.length} orders`);
  return NextResponse.json({ updated: ids.length });
}
```

- [ ] **Register on cron-job.org** — URL: `https://<your-domain>/api/cron/complete-delivered-orders?secret=<CRON_SECRET>`, interval: daily.

- [ ] **Commit**

```bash
git add app/api/cron/complete-delivered-orders/route.ts
git commit -m "feat(cron): auto-complete delivered orders after 3 days"
```

---

### Task 8: Inline Thread — Server Action

**Files:**
- Modify: `app/(dashboard)/dashboard/orders/_actions.ts` (user send)
- Modify: `app/admin/(panel)/complaints/_actions.ts` (admin send)

- [ ] **Add `sendComplaintMessageAction` to user actions**

```typescript
// In app/(dashboard)/dashboard/orders/_actions.ts
export async function sendComplaintMessageAction(
  complaintId: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Tidak terautentikasi." };

  // Verify complaint belongs to user
  const { data: complaint } = await supabase
    .from("complaints")
    .select("id")
    .eq("id", complaintId)
    .eq("user_id", user.id)
    .single();
  if (!complaint) return { success: false, error: "Komplain tidak ditemukan." };

  const { error } = await supabase.from("complaint_messages").insert({
    complaint_id: complaintId,
    sender_id: user.id,
    sender_role: "user",
    message: message.trim(),
  });
  if (error) return { success: false, error: error.message };

  revalidatePath(`/dashboard/orders`);
  return { success: true };
}
```

- [ ] **Add `sendAdminComplaintMessage` to admin actions**

```typescript
// In app/admin/(panel)/complaints/_actions.ts
export async function sendAdminComplaintMessage(
  complaintId: string,
  message: string,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { data: { user } } = await (await import("@/lib/supabase/server")).createClient().then(c => c.auth.getUser()) 
  // Note: use createClient (not service) to get current admin user id
  // Actually: import createClient separately for auth, service for DB write
```

Wait — admin user ID is needed for `sender_id`. Admin pages use `createServiceClient` for DB but need to get the logged-in admin's user ID. Use standard `createClient` for auth check, then service client for the insert.

```typescript
// In app/admin/(panel)/complaints/_actions.ts — replace the above with:
export async function sendAdminComplaintMessage(
  complaintId: string,
  message: string,
): Promise<{ error?: string }> {
  const { createClient: createAuthClient } = await import("@/lib/supabase/server");
  const authClient = await createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const supabase = await createServiceClient();
  const { error } = await supabase.from("complaint_messages").insert({
    complaint_id: complaintId,
    sender_id: user.id,
    sender_role: "admin",
    message: message.trim(),
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/complaints/${complaintId}`);
  return {};
}
```

- [ ] **Commit**

```bash
git add "app/(dashboard)/dashboard/orders/_actions.ts" "app/admin/(panel)/complaints/_actions.ts"
git commit -m "feat(complaint): add inline thread message actions for user and admin"
```

---

### Task 9: User Complaint Page — Full Upgrade

**Files:**
- Modify: `app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx`
- Create: `components/dashboard/complaint-thread.tsx`
- Create: `components/dashboard/return-awb-form.tsx`

The page must:
1. Check if complaint exists for this order.
2. If none: show `OrderComplaintForm` (existing, now upgraded).
3. If complaint exists: show complaint detail + thread + (if `return_approved`) AWB upload section.

- [ ] **Add `submitReturnAWBAction` to user actions** (`app/(dashboard)/dashboard/orders/_actions.ts`)

```typescript
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

- [ ] **Create `components/dashboard/complaint-thread.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SendHorizonal } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendComplaintMessageAction } from "@/app/(dashboard)/dashboard/orders/_actions";
import type { ComplaintMessage } from "@/lib/data/complaints";

export function ComplaintThread({
  complaintId,
  messages,
  currentUserId,
}: {
  complaintId: string;
  messages: ComplaintMessage[];
  currentUserId: string;
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function send() {
    if (!text.trim()) return;
    startTransition(async () => {
      const res = await sendComplaintMessageAction(complaintId, text);
      if (res.success) {
        setText("");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-[13px] text-[#a0a0a0]">Belum ada pesan.</p>
        )}
        {messages.map((m) => {
          const isMe = m.sender_role === "user";
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  isMe
                    ? "bg-[#EA5329] text-white rounded-br-sm"
                    : "bg-[#f0f0f0] text-[#1d1d1f] rounded-bl-sm"
                }`}
              >
                {!isMe && (
                  <p className="mb-1 text-[10px] font-semibold uppercase text-[#7a7a7a]">Tim GeekyTech</p>
                )}
                <p>{m.message}</p>
                <p className={`mt-1 text-[10px] ${isMe ? "text-white/60" : "text-[#a0a0a0]"}`}>
                  {formatDate(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tulis pesan..."
          rows={2}
          className="resize-none border-[#e0e0e0] text-[14px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
        />
        <Button type="button" variant="primary" size="icon" onClick={send} loading={pending} className="self-end h-10 w-10 shrink-0">
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Create `components/dashboard/return-awb-form.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitReturnAWBAction } from "@/app/(dashboard)/dashboard/orders/_actions";

export function ReturnAwbForm({ returnId }: { returnId: string }) {
  const [courier, setCourier] = useState("");
  const [awb, setAwb] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!courier.trim() || !awb.trim()) return;
    startTransition(async () => {
      const res = await submitReturnAWBAction(returnId, awb, courier);
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
        <Input value={courier} onChange={(e) => setCourier(e.target.value)} required placeholder="Contoh: JNE, J&T, SiCepat" className="mt-1 border-[#e0e0e0]" />
      </div>
      <div>
        <Label className="text-xs font-semibold uppercase text-[#7a7a7a]">Nomor resi</Label>
        <Input value={awb} onChange={(e) => setAwb(e.target.value)} required placeholder="Masukkan nomor resi pengiriman" className="mt-1 border-[#e0e0e0]" />
      </div>
      <Button type="submit" variant="primary" loading={pending}>
        Konfirmasi Sudah Kirim
      </Button>
    </form>
  );
}
```

- [ ] **Replace `app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx`**

```typescript
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Video } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { fetchComplaintForOrder } from "@/lib/data/complaints";
import { OrderComplaintForm } from "@/components/dashboard/order-complaint-form";
import { ComplaintThread } from "@/components/dashboard/complaint-thread";
import { ReturnAwbForm } from "@/components/dashboard/return-awb-form";

const CATEGORY_LABELS: Record<string, string> = {
  wrong_item: "Barang tidak sesuai pesanan",
  damaged: "Barang rusak / cacat",
  missing_item: "Barang kurang / tidak lengkap",
  not_as_described: "Tidak sesuai deskripsi",
  other: "Lainnya",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Baru",
  in_review: "Sedang Ditinjau",
  resolved: "Selesai",
  rejected: "Ditolak",
  return_approved: "Retur Disetujui",
};

const RETURN_STATUS_LABELS: Record<string, string> = {
  pending_shipback: "Menunggu pengiriman balik dari Anda",
  shipped_back: "Barang sedang dikirim ke GeekyTech",
  received: "Barang diterima, penggantian sedang disiapkan",
  replacement_sent: "Produk pengganti sedang dikirim",
  completed: "Retur selesai",
};

function isVideo(url: string) {
  return /\.(mp4|mov|webm)$/i.test(url);
}

export default async function OrderComplaintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/orders/${id}/complaint`);

  const detail = await fetchOrderDetailForUser(user.id, id);
  if (!detail) notFound();

  const complaint = await fetchComplaintForOrder(id);

  // No complaint yet — show form
  if (!complaint) {
    return (
      <div>
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
          Jelaskan masalah secara jujur. Tim GeekyTech akan menghubungi Anda melalui chat di halaman ini.
        </div>
        <OrderComplaintForm orderId={detail.order.id} />
      </div>
    );
  }

  const ret = complaint.return;
  const returnAddress = "Jl. Contoh No. 123, Jakarta"; // TODO: fetch from settings table

  return (
    <div className="space-y-6">
      {/* Complaint detail */}
      <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Detail Komplain</h2>
          <span className="rounded-full bg-[#f0f0f0] px-3 py-1 text-[12px] font-semibold">
            {STATUS_LABELS[complaint.status] ?? complaint.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-[14px]">
          <div>
            <p className="text-[11px] font-semibold uppercase text-[#7a7a7a]">Kategori</p>
            <p className="mt-0.5">{CATEGORY_LABELS[complaint.category] ?? complaint.category}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase text-[#7a7a7a]">Ringkasan</p>
            <p className="mt-0.5">{complaint.reason}</p>
          </div>
        </div>
        {complaint.description && (
          <div className="text-[14px]">
            <p className="text-[11px] font-semibold uppercase text-[#7a7a7a]">Detail</p>
            <p className="mt-0.5 text-[#5c5c5c]">{complaint.description}</p>
          </div>
        )}
        {complaint.images.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase text-[#7a7a7a]">Bukti media</p>
            <div className="flex flex-wrap gap-2">
              {complaint.images.map((url, i) =>
                isVideo(url) ? (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex h-16 w-16 items-center justify-center rounded-lg border border-[#e0e0e0] bg-[#f5f5f7]">
                    <Video className="h-6 w-6 text-[#a0a0a0]" />
                  </a>
                ) : (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="relative h-16 w-16 overflow-hidden rounded-lg border border-[#e0e0e0]">
                    <Image src={url} alt={`Bukti ${i + 1}`} fill sizes="64px" className="object-cover" />
                  </a>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Return approved: ship back section */}
      {complaint.status === "return_approved" && ret?.status === "pending_shipback" && (
        <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 sm:p-6 space-y-4">
          <h2 className="text-[17px] font-semibold">Kirim Barang Kembali</h2>
          <div className="rounded-lg bg-[#f5f5f7] px-4 py-3 text-[13px] leading-relaxed text-[#5c5c5c]">
            <p className="font-medium text-[#1d1d1f]">Alamat pengiriman:</p>
            <p className="mt-1">{returnAddress}</p>
            <p className="mt-2 text-[12px]">Biaya pengiriman ditanggung pembeli. Setelah mengirim, masukkan nomor resi di bawah.</p>
          </div>
          <ReturnAwbForm returnId={ret.id} />
        </div>
      )}

      {/* Return status */}
      {ret && ret.status !== "pending_shipback" && (
        <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 sm:p-6 space-y-3">
          <h2 className="text-[17px] font-semibold">Status Retur</h2>
          <p className="text-[14px] text-[#5c5c5c]">{RETURN_STATUS_LABELS[ret.status] ?? ret.status}</p>
          {ret.status === "replacement_sent" && ret.return_shipments.length > 0 && (
            <div className="rounded-lg border border-[#e0e0e0] p-3 text-[13px]">
              <p className="font-medium">Penggantian dikirim via {ret.return_shipments[0].courier}</p>
              <p className="mt-0.5 font-mono text-[#EA5329]">{ret.return_shipments[0].awb_number}</p>
              <Link href={`/dashboard/orders/${id}/return`} className="mt-2 inline-block text-[12px] underline">
                Lihat detail retur →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Thread */}
      <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-[17px] font-semibold">Pesan ke Tim GeekyTech</h2>
        <ComplaintThread
          complaintId={complaint.id}
          messages={complaint.messages}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
```

> **Note:** Replace the hardcoded `returnAddress` with a fetch from `settings` table using the pattern already used in `lib/admin/settings/shipping/_lib/store-origin.ts`.

- [ ] **Commit**

```bash
git add "app/(dashboard)/dashboard/orders/[id]/complaint/page.tsx" \
        "components/dashboard/complaint-thread.tsx" \
        "components/dashboard/return-awb-form.tsx" \
        "app/(dashboard)/dashboard/orders/_actions.ts"
git commit -m "feat(complaint): upgrade complaint page with thread and return AWB flow"
```

---

### Task 10: User Return Status Page

**Files:**
- Create: `app/(dashboard)/dashboard/orders/[id]/return/page.tsx`

- [ ] **Create page**

```typescript
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { fetchComplaintForOrder } from "@/lib/data/complaints";

const RETURN_STATUS_LABELS: Record<string, string> = {
  pending_shipback: "Menunggu pengiriman balik",
  shipped_back: "Barang dalam perjalanan ke GeekyTech",
  received: "Barang diterima, penggantian sedang disiapkan",
  replacement_sent: "Produk pengganti sedang dikirim",
  completed: "Retur selesai",
};

export default async function OrderReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/orders/${id}/return`);

  const detail = await fetchOrderDetailForUser(user.id, id);
  if (!detail) notFound();

  const complaint = await fetchComplaintForOrder(id);
  const ret = complaint?.return;
  if (!ret) redirect(`/dashboard/orders/${id}/complaint`);

  const shipment = ret.return_shipments[0] ?? null;

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/orders/${id}/complaint`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#EA5329] underline-offset-2 hover:underline">
        <ArrowLeft size={13} /> Kembali ke komplain
      </Link>

      <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 sm:p-6 space-y-4">
        <h1 className="text-[22px] font-semibold">Status Retur</h1>
        <p className="text-[15px] text-[#5c5c5c]">{RETURN_STATUS_LABELS[ret.status] ?? ret.status}</p>

        {ret.return_awb && (
          <div className="rounded-lg bg-[#f5f5f7] p-4 text-[13px] space-y-1">
            <p className="text-[11px] font-semibold uppercase text-[#7a7a7a]">Resi pengiriman balik Anda</p>
            <p className="font-medium">{ret.return_courier}</p>
            <p className="font-mono text-[#1d1d1f]">{ret.return_awb}</p>
          </div>
        )}

        {shipment && (
          <div className="rounded-lg border border-[#e0e0e0] p-4 text-[13px] space-y-1">
            <p className="text-[11px] font-semibold uppercase text-[#7a7a7a]">Pengiriman penggantian</p>
            <p className="font-medium">{shipment.courier}</p>
            {shipment.awb_number && (
              <p className="font-mono text-[#EA5329] text-[15px] font-semibold">{shipment.awb_number}</p>
            )}
            {shipment.status && (
              <p className="text-[#7a7a7a]">Status: {shipment.status}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add "app/(dashboard)/dashboard/orders/[id]/return/page.tsx"
git commit -m "feat(return): add user return status page"
```

---

### Task 11: Admin Complaint Actions — Return Flow

**Files:**
- Modify: `app/admin/(panel)/complaints/_actions.ts`

- [ ] **Add `approveReturn`**

```typescript
export async function approveReturn(
  complaintId: string,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { data: complaint } = await supabase
    .from("complaints")
    .select("id, order_id, user_id, status")
    .eq("id", complaintId)
    .single();

  if (!complaint) return { error: "Komplain tidak ditemukan." };
  if (complaint.status !== "in_review") return { error: "Status harus 'Ditinjau' untuk approve retur." };

  // Idempotency: skip if return already exists
  const { data: existing } = await supabase
    .from("returns")
    .select("id")
    .eq("complaint_id", complaintId)
    .maybeSingle();

  if (!existing) {
    const { error: retErr } = await supabase.from("returns").insert({
      complaint_id: complaintId,
      order_id: complaint.order_id,
      user_id: complaint.user_id,
      status: "pending_shipback",
    });
    if (retErr) return { error: retErr.message };
  }

  const { error } = await supabase
    .from("complaints")
    .update({ status: "return_approved" })
    .eq("id", complaintId);
  if (error) return { error: error.message };

  // Notify user
  await createNotification({
    userId: complaint.user_id as string,
    title: "Retur Disetujui",
    body: "Pengajuan retur Anda telah disetujui. Silakan kirim barang ke GeekyTech.",
    type: "order_update",
    data: { complaint_id: complaintId },
  });

  revalidatePath(`/admin/complaints/${complaintId}`);
  revalidatePath("/admin/complaints");
  return {};
}
```

- [ ] **Add `confirmReturnReceived`**

```typescript
export async function confirmReturnReceived(
  returnId: string,
  complaintId: string,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("returns")
    .update({ status: "received", updated_at: new Date().toISOString() })
    .eq("id", returnId)
    .eq("status", "shipped_back");

  if (error) return { error: error.message };

  revalidatePath(`/admin/complaints/${complaintId}`);
  return {};
}
```

- [ ] **Add `createReplacementShipment`**

```typescript
import { createBiteshipOrder } from "@/lib/biteship/create-order";

export async function createReplacementShipment(input: {
  returnId: string;
  complaintId: string;
  orderId: string;
  items: { name: string; value: number; quantity: number; weight: number }[];
  destinationName: string;
  destinationPhone: string;
  destinationAddress: string;
  destinationPostalCode: number;
  courierCompany: string;
  courierType: string;
  userId: string;
}): Promise<{ error?: string }> {
  const result = await createBiteshipOrder({
    destinationName: input.destinationName,
    destinationPhone: input.destinationPhone,
    destinationAddress: input.destinationAddress,
    destinationPostalCode: input.destinationPostalCode,
    courierCompany: input.courierCompany,
    courierType: input.courierType,
    items: input.items,
    orderNote: "Penggantian produk retur",
  });

  if (!result.ok) return { error: result.error };

  const supabase = await createServiceClient();

  const { error: shipErr } = await supabase.from("return_shipments").insert({
    return_id: input.returnId,
    biteship_order_id: result.biteshipOrderId,
    awb_number: result.awb,
    courier: result.courierName ?? input.courierCompany,
    status: result.status,
  });
  if (shipErr) return { error: shipErr.message };

  await supabase
    .from("returns")
    .update({ status: "replacement_sent", updated_at: new Date().toISOString() })
    .eq("id", input.returnId);

  // Notify user
  await createNotification({
    userId: input.userId,
    title: "Produk Pengganti Dikirim",
    body: `Produk pengganti untuk komplain Anda sedang dalam perjalanan${result.awb ? ` (resi: ${result.awb})` : ""}.`,
    type: "order_update",
    data: { complaint_id: input.complaintId, awb: result.awb },
  });

  revalidatePath(`/admin/complaints/${input.complaintId}`);
  revalidatePath("/admin/returns");
  return {};
}
```

Add `createNotification` import to the file:
```typescript
import { createNotification } from "@/lib/notifications/create-notification";
```

- [ ] **Commit**

```bash
git add "app/admin/(panel)/complaints/_actions.ts"
git commit -m "feat(admin): add approveReturn, confirmReturnReceived, createReplacementShipment actions"
```

---

### Task 12: Admin Complaint Detail UI Upgrade

**Files:**
- Modify: `app/admin/(panel)/complaints/[id]/page.tsx`
- Modify: `app/admin/(panel)/complaints/[id]/_components/complaint-detail.tsx`
- Create: `app/admin/(panel)/complaints/[id]/_components/admin-complaint-thread.tsx`
- Create: `app/admin/(panel)/complaints/[id]/_components/return-manager.tsx`

- [ ] **Check what `complaints/[id]/page.tsx` fetches** — open the file and verify it selects complaint fields. Add to the query: `category`, `complaint_messages(*)`, and a join to `returns(*, return_shipments(*))`.

- [ ] **Fetch complaint + messages + return in page.tsx**

In `app/admin/(panel)/complaints/[id]/page.tsx`, replace the complaint select query to:

```typescript
const { data: complaint } = await supabase
  .from("complaints")
  .select(`
    id, type, category, reason, description, status, admin_note, images, created_at, resolved_at,
    orders(id, order_number, shipping_address, shipping_phone, shipping_name, order_items(snapshot_name, snapshot_price, quantity, variant_id, product_variants(weight))),
    profiles(full_name, phone),
    complaint_messages(id, sender_id, sender_role, message, created_at),
    returns(id, status, return_awb, return_courier, created_at, updated_at, return_shipments(id, awb_number, courier, status))
  `)
  .eq("id", complaintId)
  .single();
```

- [ ] **Create `admin-complaint-thread.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SendHorizonal } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendAdminComplaintMessage } from "../../_actions";

type Message = { id: string; sender_role: string; message: string; created_at: string };

export function AdminComplaintThread({
  complaintId,
  messages,
}: {
  complaintId: string;
  messages: Message[];
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function send() {
    if (!text.trim()) return;
    startTransition(async () => {
      const { error } = await sendAdminComplaintMessage(complaintId, text);
      if (error) toast.error(error);
      else setText("");
    });
  }

  return (
    <div className="space-y-4">
      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-[13px] text-muted-foreground">Belum ada pesan.</p>
        )}
        {messages.map((m) => {
          const isAdmin = m.sender_role === "admin";
          return (
            <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  isAdmin
                    ? "bg-brand text-white rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {!isAdmin && (
                  <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Pelanggan</p>
                )}
                <p>{m.message}</p>
                <p className={`mt-1 text-[10px] ${isAdmin ? "text-white/60" : "text-muted-foreground"}`}>
                  {formatDate(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Balas ke pelanggan..."
          rows={2}
          className="resize-none text-[14px]"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <Button type="button" variant="primary" size="icon" onClick={send} loading={pending} className="self-end h-10 w-10 shrink-0">
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Create `return-manager.tsx`**

This component shows return status + action buttons (approve, confirm received, replacement form) based on current state.

```typescript
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { approveReturn, confirmReturnReceived, createReplacementShipment } from "../../_actions";

type ReturnData = {
  id: string;
  status: string;
  return_awb: string | null;
  return_courier: string | null;
  return_shipments: { awb_number: string | null; courier: string | null; status: string | null }[];
};

type OrderItem = {
  snapshot_name: string;
  snapshot_price: number;
  quantity: number;
  variant_id: string | null;
  product_variants: { weight: number | null } | null;
};

type OrderSnap = {
  id: string;
  order_number: string;
  shipping_address: string;
  shipping_phone: string;
  shipping_name: string;
  order_items: OrderItem[];
};

export function ReturnManager({
  complaintId,
  complaintStatus,
  returnData,
  order,
  userId,
}: {
  complaintId: string;
  complaintStatus: string;
  returnData: ReturnData | null;
  order: OrderSnap | null;
  userId: string;
}) {
  const [pending, startTransition] = useTransition();

  // Replacement form state
  const [courier, setCourier] = useState("");
  const [courierType, setCourierType] = useState("reg");
  const [itemQtys, setItemQtys] = useState<Record<number, number>>(
    () => Object.fromEntries((order?.order_items ?? []).map((_, i) => [i, (order?.order_items[i]?.quantity ?? 1)]))
  );
  const [itemSelected, setItemSelected] = useState<Record<number, boolean>>(
    () => Object.fromEntries((order?.order_items ?? []).map((_, i) => [i, true]))
  );

  function handleApprove() {
    startTransition(async () => {
      const { error } = await approveReturn(complaintId);
      if (error) toast.error(error);
      else toast.success("Retur disetujui.");
    });
  }

  function handleConfirmReceived() {
    if (!returnData) return;
    startTransition(async () => {
      const { error } = await confirmReturnReceived(returnData.id, complaintId);
      if (error) toast.error(error);
      else toast.success("Penerimaan barang dikonfirmasi.");
    });
  }

  function handleCreateShipment(e: React.FormEvent) {
    e.preventDefault();
    if (!returnData || !order) return;
    const items = (order.order_items ?? [])
      .filter((_, i) => itemSelected[i])
      .map((item, i) => ({
        name: item.snapshot_name,
        value: item.snapshot_price,
        quantity: itemQtys[i] ?? item.quantity,
        weight: item.product_variants?.weight ?? 500,
      }));
    if (items.length === 0) { toast.error("Pilih minimal satu item."); return; }

    startTransition(async () => {
      const { error } = await createReplacementShipment({
        returnId: returnData.id,
        complaintId,
        orderId: order.id,
        items,
        destinationName: order.shipping_name,
        destinationPhone: order.shipping_phone,
        destinationAddress: order.shipping_address,
        destinationPostalCode: 0, // TODO: fetch from order snapshot if available
        courierCompany: courier,
        courierType,
        userId,
      });
      if (error) toast.error(error);
      else toast.success("Shipment Biteship berhasil dibuat.");
    });
  }

  return (
    <div className="space-y-4">
      {/* Approve return button */}
      {complaintStatus === "in_review" && !returnData && (
        <Button type="button" variant="primary" size="sm" onClick={handleApprove} loading={pending}>
          Setujui Retur
        </Button>
      )}

      {/* Return detail */}
      {returnData && (
        <div className="space-y-3 text-[14px]">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Status retur</p>
          <p className="font-medium capitalize">{returnData.status.replace(/_/g, " ")}</p>

          {returnData.return_awb && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Resi dari pembeli</p>
              <p>{returnData.return_courier}</p>
              <p className="font-mono font-semibold">{returnData.return_awb}</p>
            </div>
          )}

          {returnData.status === "shipped_back" && (
            <Button type="button" variant="pearl" size="sm" onClick={handleConfirmReceived} loading={pending}>
              Konfirmasi Terima Barang
            </Button>
          )}

          {returnData.status === "received" && order && (
            <form onSubmit={handleCreateShipment} className="space-y-4 rounded-lg border border-[#e0e0e0] p-4">
              <p className="font-semibold">Buat Shipment Penggantian</p>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Item yang diganti</p>
                {order.order_items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input type="checkbox" checked={itemSelected[i] ?? true}
                      onChange={(e) => setItemSelected((p) => ({ ...p, [i]: e.target.checked }))} />
                    <span className="flex-1 text-[13px]">{item.snapshot_name}</span>
                    <input type="number" min={1} max={item.quantity}
                      value={itemQtys[i] ?? item.quantity}
                      onChange={(e) => setItemQtys((p) => ({ ...p, [i]: Number(e.target.value) }))}
                      className="w-16 rounded border border-[#e0e0e0] px-2 py-1 text-[13px]" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Kurir</Label>
                  <Input value={courier} onChange={(e) => setCourier(e.target.value)} required
                    placeholder="jne / jnt / sicepat" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Tipe layanan</Label>
                  <Input value={courierType} onChange={(e) => setCourierType(e.target.value)} required
                    placeholder="reg / yes / oke" className="mt-1" />
                </div>
              </div>

              <Button type="submit" variant="primary" size="sm" loading={pending}>
                Buat Shipment Biteship
              </Button>
            </form>
          )}

          {returnData.return_shipments.length > 0 && (
            <div className="rounded-lg border border-[#e0e0e0] p-3 space-y-1 text-[13px]">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Pengiriman penggantian</p>
              <p>{returnData.return_shipments[0].courier}</p>
              <p className="font-mono font-semibold">{returnData.return_shipments[0].awb_number}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Wire up components in `complaint-detail.tsx`** — import and render `AdminComplaintThread` below the existing admin note section, and render `ReturnManager` inside the sidebar actions card (below existing status buttons). Pass the new data from props.

Update the `ComplaintDetail` type in `complaint-detail.tsx` to include:
```typescript
category: string;
complaint_messages: { id: string; sender_role: string; message: string; created_at: string }[];
returns: ReturnData | null;  // use the type from return-manager
orders: { ... ; order_items: OrderItem[]; shipping_name: string; shipping_phone: string; shipping_address: string } | null;
user_id: string;
```

- [ ] **Commit**

```bash
git add "app/admin/(panel)/complaints/[id]/_components/admin-complaint-thread.tsx" \
        "app/admin/(panel)/complaints/[id]/_components/return-manager.tsx" \
        "app/admin/(panel)/complaints/[id]/_components/complaint-detail.tsx" \
        "app/admin/(panel)/complaints/[id]/page.tsx"
git commit -m "feat(admin): add inline thread and return manager to complaint detail"
```

---

### Task 13: Admin Returns List Page

**Files:**
- Create: `app/admin/(panel)/returns/page.tsx`
- Create: `app/admin/(panel)/returns/_components/returns-table.tsx`

- [ ] **Create returns table component**

```typescript
// app/admin/(panel)/returns/_components/returns-table.tsx
"use client";

import Link from "next/link";
import { formatDate } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  pending_shipback: "Menunggu Kirim Balik",
  shipped_back: "Dikirim Pembeli",
  received: "Diterima",
  replacement_sent: "Penggantian Dikirim",
  completed: "Selesai",
};

type ReturnRow = {
  id: string;
  status: string;
  return_awb: string | null;
  created_at: string;
  complaints: { id: string; reason: string } | null;
  orders: { order_number: string } | null;
  profiles: { full_name: string | null } | null;
};

export function ReturnsTable({ rows }: { rows: ReturnRow[] }) {
  if (rows.length === 0) {
    return <p className="text-[14px] text-muted-foreground">Belum ada pengajuan retur.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b border-[#e0e0e0] text-left text-[11px] font-semibold uppercase text-muted-foreground">
            <th className="pb-3 pr-4">No. Order</th>
            <th className="pb-3 pr-4">Pelanggan</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3 pr-4">Dibuat</th>
            <th className="pb-3">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f0f0]">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="py-3 pr-4 font-mono text-[13px]">{r.orders?.order_number ?? "—"}</td>
              <td className="py-3 pr-4">{r.profiles?.full_name ?? "—"}</td>
              <td className="py-3 pr-4">
                <span className="rounded-full bg-[#f0f0f0] px-2.5 py-1 text-[11px] font-semibold">
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </td>
              <td className="py-3 pr-4 text-muted-foreground">{formatDate(r.created_at)}</td>
              <td className="py-3">
                {r.complaints?.id && (
                  <Link href={`/admin/complaints/${r.complaints.id}`}
                    className="admin-text-link text-[13px]">
                    Lihat komplain →
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Create page**

```typescript
// app/admin/(panel)/returns/page.tsx
import { createServiceClient } from "@/lib/supabase/server";
import { ReturnsTable } from "./_components/returns-table";

export default async function AdminReturnsPage() {
  const supabase = await createServiceClient();
  const { data: rows } = await supabase
    .from("returns")
    .select(`
      id, status, return_awb, created_at,
      complaints(id, reason),
      orders(order_number),
      profiles(full_name)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <p className="text-swiss-eyebrow">Layanan</p>
        <h1 className="text-[34px] font-semibold uppercase">Pengajuan Retur</h1>
      </div>
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Semua Retur ({rows?.length ?? 0})</h2>
        </div>
        <div className="p-6">
          <ReturnsTable rows={(rows ?? []) as any} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Add "Returns" to admin sidebar navigation** — find sidebar nav file and add entry:
  - Label: "Retur"
  - Href: `/admin/returns`
  - Icon: `RotateCcw` from lucide-react

- [ ] **Commit**

```bash
git add "app/admin/(panel)/returns/page.tsx" \
        "app/admin/(panel)/returns/_components/returns-table.tsx"
git commit -m "feat(admin): add returns list page"
```

---

## Self-Review Checklist

- [x] `delivered_at` already exists in orders — no migration needed for that
- [x] `order_status` enum already includes `completed` — no migration needed
- [x] `complaints.status` is `text` (not enum) — `return_approved` string works without migration
- [x] `createBiteshipOrder` used as-is from `lib/biteship/create-order.ts`
- [x] `createNotification` called on `approveReturn` and `createReplacementShipment`
- [x] 3-day gate in both `submitComplaintAction` (server) and tracking page (UI)
- [x] Media upload goes through `/api/complaint-upload` route (auth-gated)
- [x] Admin sender_id uses auth user ID (not profiles FK) — no FK violation
- [x] `fetchComplaintForOrder` is user-scoped (RLS via createClient)
- [ ] **Note:** `destinationPostalCode` in `createReplacementShipment` defaults to `0` — admin should add postal code field to the replacement form, or fetch it from the order snapshot if stored. Add this as a follow-up if postal code is not in order snapshot.
- [ ] **Note:** Return address shown to user in complaint page is hardcoded — fetch from `settings` table using existing pattern from `lib/admin/settings/shipping/_lib/store-origin.ts`.
