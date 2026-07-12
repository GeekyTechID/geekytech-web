# Chat Auto-Reply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send an automatic "Admin" chat bubble the instant a user opens a new chat session, with an admin-editable on/off toggle and message template, and add the missing Quick Replies management UI.

**Architecture:** Extend the existing `POST /api/chat/sessions` route to insert a second message (after the existing "Sesi dimulai" system message) using a template stored in the existing `settings` key-value table. A new admin page `/admin/chat/quick-replies` hosts both the auto-reply settings form and full CRUD for `chat_quick_replies` (which currently only has an API, no UI).

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (Postgres + service-role client), Tailwind, shadcn/ui primitives already in the repo (`Button`, `Textarea`, `Input`, `StatusPillToggle`), `sonner` toast.

**Spec:** [docs/superpowers/specs/2026-07-11-chat-auto-reply-design.md](../specs/2026-07-11-chat-auto-reply-design.md)

## Global Constraints

- No new database migrations. Reuse the existing `settings` table (key-value, `value: Json`) for `chat_auto_reply_enabled` (boolean) and `chat_auto_reply_template` (string).
- No new sender/bot profile. The auto-reply message's `sender_id` must be a real row from `profiles` with `role = 'admin'`, picked dynamically (`ORDER BY created_at ASC LIMIT 1`). Never reuse the customer's own `user.id` as `sender_id` for this message — bubble side/color in [chat-message-item.tsx:50](../../../components/chat/chat-message-item.tsx#L50) is `isMine = message.sender_id === myUserId`, so using the customer's id would render the auto-reply as the customer's own bubble.
- Placeholders supported in the template: `{{name}}` and `{{subject}}` (literal double-curly, replaced via string substitution, not a templating engine).
- `{{name}}` falls back to `"Kak"` when the user has no `full_name`.
- Auto-reply insertion must never fail session creation — wrap in try/catch, best-effort only.
- **No test framework exists in this repo** (no jest/vitest/tsx in `package.json`, zero `*.test.ts(x)` files outside `node_modules`). Do not add one for this feature — out of scope and not requested. Verification per task = `npx tsc --noEmit` (type correctness) + manual browser QA against the running dev server, per this project's actual convention (CLAUDE.md: type checks verify correctness, not feature correctness; UI changes must be exercised in a browser). Every task below ends with an explicit manual verification step instead of an automated test run.
- All server-mutating code follows the repo's existing per-folder `_actions.ts` convention (see `app/admin/(panel)/settings/faq/_actions.ts`) — do not introduce a shared/global actions file.
- Copy is Indonesian, informal "kamu"-register, matching existing user-facing strings (e.g. `supabase/migrations/015_welcome_notification.sql`).

---

### Task 1: Auto-reply template renderer

**Files:**
- Create: `lib/chat/render-auto-reply-template.ts`

**Interfaces:**
- Consumes: nothing (pure function, no external deps)
- Produces: `renderAutoReplyTemplate(template: string, vars: { name: string | null; subject: string }): string` — used by Task 3 (API route) and Task 5 (admin preview UI)

- [ ] **Step 1: Write the implementation**

```ts
// lib/chat/render-auto-reply-template.ts
export function renderAutoReplyTemplate(
  template: string,
  vars: { name: string | null; subject: string },
): string {
  const name = vars.name?.trim() || "Kak";
  return template.replaceAll("{{name}}", name).replaceAll("{{subject}}", vars.subject);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `render-auto-reply-template.ts`.

- [ ] **Step 3: Manual verification**

Temporarily add `console.log(renderAutoReplyTemplate("Halo {{name}}, soal {{subject}}", { name: null, subject: "tanya stok" }))` inside any existing server file you already have open in a running `next dev` request path (e.g. paste at the top of `app/api/chat/sessions/route.ts`'s `POST` temporarily), hit the endpoint once, confirm the server log prints `Halo Kak, soal tanya stok`, then remove the temporary line. (This function gets exercised for real in Task 3's verification — this step just confirms the fallback logic in isolation before wiring it up.)

- [ ] **Step 4: Commit**

```bash
git add lib/chat/render-auto-reply-template.ts
git commit -m "feat: add auto-reply template renderer"
```

---

### Task 2: Auto-reply settings reader

**Files:**
- Modify: `lib/settings/queries.ts`

**Interfaces:**
- Consumes: `createServiceClient` from `@/lib/supabase/server` (already imported elsewhere in the repo, e.g. `app/admin/(panel)/settings/_actions.ts`)
- Produces: `getChatAutoReplySettings(): Promise<ChatAutoReplySettings>` where `ChatAutoReplySettings = { enabled: boolean; template: string }`, and `DEFAULT_CHAT_AUTO_REPLY_TEMPLATE: string` — used by Task 3 (API route) and Task 7 (page.tsx initial values)

- [ ] **Step 1: Add the import and the new export**

Modify `lib/settings/queries.ts` — change the top import line and append the new code at the end of the file:

```ts
import "server-only";

import { cache } from "react";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { DEFAULT_STORE_ORIGIN, parseStoreOrigin, type StoreOrigin } from "./store-origin";
```

Append at the end of the file:

```ts
export type ChatAutoReplySettings = {
  enabled: boolean;
  template: string;
};

export const DEFAULT_CHAT_AUTO_REPLY_TEMPLATE =
  "Halo {{name}}, makasih udah hubungi GeekyTech soal {{subject}}. Pesanmu udah kami terima dan bakal dibalas tim kami secepatnya. Ditunggu ya!";

export async function getChatAutoReplySettings(): Promise<ChatAutoReplySettings> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["chat_auto_reply_enabled", "chat_auto_reply_template"]);

    const enabledRow = data?.find((row) => row.key === "chat_auto_reply_enabled");
    const templateRow = data?.find((row) => row.key === "chat_auto_reply_template");

    const enabled = typeof enabledRow?.value === "boolean" ? enabledRow.value : true;
    const template =
      typeof templateRow?.value === "string" && templateRow.value.trim().length > 0
        ? templateRow.value
        : DEFAULT_CHAT_AUTO_REPLY_TEMPLATE;

    return { enabled, template };
  } catch {
    return { enabled: true, template: DEFAULT_CHAT_AUTO_REPLY_TEMPLATE };
  }
}
```

Note: unlike `getStoreOrigin`/`getWhatsappCs`, this uses `createServiceClient()` (not the cookie-bound `createClient()` wrapped in `cache()`). It's only ever called from server-only, non-user-scoped contexts (an API route and an admin page already gated by a role check), so there's no RLS concern to route around and no benefit from React's per-render `cache()` dedup (it's called once per request in both call sites added in later tasks).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. `createClient` import still used by the existing `getStoreOrigin`/`getWhatsappCs` functions in the same file — confirm no "unused import" lint warning by running `npm run lint` too.

- [ ] **Step 3: Manual verification**

Not independently observable yet (no UI/route calls it until Task 3/7) — covered by those tasks' verification steps.

- [ ] **Step 4: Commit**

```bash
git add lib/settings/queries.ts
git commit -m "feat: add getChatAutoReplySettings settings reader"
```

---

### Task 3: Wire auto-reply into session creation

**Files:**
- Modify: `app/api/chat/sessions/route.ts`

**Interfaces:**
- Consumes: `renderAutoReplyTemplate` (Task 1), `getChatAutoReplySettings` (Task 2)
- Produces: nothing new consumed by later tasks — this is the runtime behavior itself

- [ ] **Step 1: Add imports**

At the top of `app/api/chat/sessions/route.ts`, add two imports alongside the existing ones:

```ts
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";
import { getChatAutoReplySettings } from "@/lib/settings/queries";
import { renderAutoReplyTemplate } from "@/lib/chat/render-auto-reply-template";
```

- [ ] **Step 2: Insert the auto-reply block**

In the `POST` handler, the existing code (after the system message insert) reads:

```ts
    // System message: session started
    await svc.from("chat_messages").insert({
      session_id: session.id,
      sender_id: user.id,
      sender_role: "system",
      content: "Sesi chat dimulai.",
      message_type: "system",
    });

    // Notify admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    await createAdminNotification({
```

Replace it with (adds the auto-reply block between the profile fetch and the notification call, reusing the same `profile` query for both):

```ts
    // System message: session started
    await svc.from("chat_messages").insert({
      session_id: session.id,
      sender_id: user.id,
      sender_role: "system",
      content: "Sesi chat dimulai.",
      message_type: "system",
    });

    // Notify admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    // Auto-reply: pesan sambutan otomatis dari admin (best-effort, tidak boleh gagalkan sesi)
    try {
      const { enabled, template } = await getChatAutoReplySettings();
      if (enabled && template.trim()) {
        const { data: adminProfile } = await svc
          .from("profiles")
          .select("id")
          .eq("role", "admin")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (adminProfile) {
          const content = renderAutoReplyTemplate(template, {
            name: profile?.full_name ?? null,
            subject: parsed.data.subject,
          });
          await svc.from("chat_messages").insert({
            session_id: session.id,
            sender_id: adminProfile.id,
            sender_role: "admin",
            content,
            message_type: "text",
          });
        }
      }
    } catch {
      // best-effort — auto-reply gagal tidak boleh gagalkan pembuatan sesi
    }

    await createAdminNotification({
```

The rest of the file (the `createAdminNotification` call body and everything after) stays unchanged.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `app/api/chat/sessions/route.ts`.

- [ ] **Step 4: Manual verification**

1. Start the dev server, log in as a test customer account (not admin), open the chat widget, submit a new session with subject "tes auto reply".
2. Confirm two messages appear in order: the gray centered "Sesi chat dimulai." system label, then a **left-aligned muted bubble** reading the default template with your name and "tes auto reply" substituted in.
3. Confirm the bubble is NOT right-aligned/primary-colored (that would mean `sender_id` wrongly matched the customer).
4. In Supabase (or via `psql`), manually set `settings` row `key='chat_auto_reply_enabled'` to `value=false` (insert if absent: `insert into settings (key, value) values ('chat_auto_reply_enabled', 'false') on conflict (key) do update set value = excluded.value;`). Close the existing session as admin, open a new session as the customer, confirm no auto-reply bubble appears this time (only the system message).
5. Reset `chat_auto_reply_enabled` back to `true` (or delete the row) before moving on, so later tasks default to enabled.

- [ ] **Step 5: Commit**

```bash
git add app/api/chat/sessions/route.ts
git commit -m "feat: send auto-reply message on new chat session"
```

---

### Task 4: Server actions for the new admin page

**Files:**
- Create: `app/admin/(panel)/chat/quick-replies/_actions.ts`

**Interfaces:**
- Consumes: `createServiceClient` from `@/lib/supabase/server`, `Json` type from `@/types/supabase`
- Produces: `saveChatAutoReplySettings(enabled: boolean, template: string): Promise<{ error?: string }>` — used by Task 5

- [ ] **Step 1: Write the server action**

```ts
// app/admin/(panel)/chat/quick-replies/_actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function saveChatAutoReplySettings(
  enabled: boolean,
  template: string,
): Promise<{ error?: string }> {
  if (enabled && !template.trim()) {
    return { error: "Template tidak boleh kosong kalau auto-reply aktif." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("settings").upsert(
    [
      { key: "chat_auto_reply_enabled", value: enabled as Json },
      { key: "chat_auto_reply_template", value: template.trim() as Json },
    ],
    { onConflict: "key" },
  );

  if (error) return { error: error.message };
  revalidatePath("/admin/chat/quick-replies");
  return {};
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in the new file.

- [ ] **Step 3: Manual verification**

Not independently observable yet (no UI calls it until Task 5) — covered by Task 5's verification.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(panel)/chat/quick-replies/_actions.ts"
git commit -m "feat: add server action to save chat auto-reply settings"
```

---

### Task 5: Auto-reply settings form (client component)

**Files:**
- Create: `app/admin/(panel)/chat/quick-replies/_components/auto-reply-form.tsx`

**Interfaces:**
- Consumes: `saveChatAutoReplySettings` (Task 4), `renderAutoReplyTemplate` (Task 1), `Button`/`Textarea`/`StatusPillToggle` from `@/components/ui/*`
- Produces: `<AutoReplyForm initialEnabled: boolean, initialTemplate: string />` — used by Task 7 (page.tsx)

- [ ] **Step 1: Write the component**

```tsx
// app/admin/(panel)/chat/quick-replies/_components/auto-reply-form.tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
import { renderAutoReplyTemplate } from "@/lib/chat/render-auto-reply-template";
import { saveChatAutoReplySettings } from "../_actions";

interface AutoReplyFormProps {
  initialEnabled: boolean;
  initialTemplate: string;
}

export function AutoReplyForm({ initialEnabled, initialTemplate }: AutoReplyFormProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [template, setTemplate] = useState(initialTemplate);
  const [isPending, startTransition] = useTransition();

  const preview = renderAutoReplyTemplate(template, {
    name: "Budi",
    subject: "tanya stok iPhone 15",
  });

  const handleSave = () => {
    if (enabled && !template.trim()) {
      toast.error("Template tidak boleh kosong kalau auto-reply aktif.");
      return;
    }
    startTransition(async () => {
      const { error } = await saveChatAutoReplySettings(enabled, template);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Pengaturan auto-reply disimpan.");
    });
  };

  return (
    <div className="admin-utility-card space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-foreground">Auto-Reply</p>
          <p className="text-xs text-muted-foreground">
            Kirim pesan sambutan otomatis saat user buka sesi chat baru.
          </p>
        </div>
        <StatusPillToggle
          active={enabled}
          onToggle={() => setEnabled((v) => !v)}
          activeLabel="Aktif"
          inactiveLabel="Nonaktif"
          size="compact"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase text-foreground">
          Template Pesan
        </label>
        <Textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder="Halo {{name}}, makasih udah hubungi GeekyTech soal {{subject}}..."
          className="min-h-24 rounded-lg border-[#e0e0e0] text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          Gunakan <code className="font-mono">{"{{name}}"}</code> dan{" "}
          <code className="font-mono">{"{{subject}}"}</code> sebagai placeholder.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase text-foreground">Preview</p>
        <div className="w-fit max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground">
          {preview || <span className="text-muted-foreground">Isi template kosong</span>}
        </div>
      </div>

      <Button type="button" variant="primary" size="sm" onClick={handleSave} loading={isPending}>
        Simpan
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (This component isn't reachable from any page yet — that's Task 7 — so this only confirms it compiles standalone.)

- [ ] **Step 3: Manual verification**

Deferred to Task 7 (needs `page.tsx` to render it).

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(panel)/chat/quick-replies/_components/auto-reply-form.tsx"
git commit -m "feat: add auto-reply settings form component"
```

---

### Task 6: Quick-reply manager (client component)

**Files:**
- Create: `app/admin/(panel)/chat/quick-replies/_components/quick-reply-manager.tsx`

**Interfaces:**
- Consumes: existing `/api/admin/chat/quick-replies` API (GET/POST/DELETE, already implemented in `app/api/admin/chat/quick-replies/route.ts` — no changes needed there), `ChatQuickReply` type from `@/types/chat`, `AdminTableDeleteButton` from `@/components/admin/admin-table-row-actions`
- Produces: `<QuickReplyManager initialReplies: ChatQuickReply[] />` — used by Task 7 (page.tsx)

- [ ] **Step 1: Write the component**

```tsx
// app/admin/(panel)/chat/quick-replies/_components/quick-reply-manager.tsx
"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminTableDeleteButton } from "@/components/admin/admin-table-row-actions";
import type { ChatQuickReply } from "@/types/chat";

interface QuickReplyManagerProps {
  initialReplies: ChatQuickReply[];
}

export function QuickReplyManager({ initialReplies }: QuickReplyManagerProps) {
  const [replies, setReplies] = useState<ChatQuickReply[]>(initialReplies);
  const [shortcut, setShortcut] = useState("");
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!shortcut.trim() || !content.trim()) {
      toast.error("Shortcut dan isi pesan wajib diisi.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/chat/quick-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortcut: shortcut.trim(), content: content.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(typeof json.error === "string" ? json.error : "Gagal menyimpan quick reply.");
        return;
      }
      setReplies((prev) =>
        [...prev, json.data as ChatQuickReply].sort((a, b) => a.shortcut.localeCompare(b.shortcut)),
      );
      setShortcut("");
      setContent("");
      toast.success("Quick reply ditambahkan.");
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Hapus quick reply ini? Tindakan tidak bisa dibatalkan.")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/chat/quick-replies?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        toast.error(typeof json.error === "string" ? json.error : "Gagal menghapus quick reply.");
        return;
      }
      setReplies((prev) => prev.filter((r) => r.id !== id));
      toast.success("Quick reply dihapus.");
    });
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleAdd}
        className="admin-utility-card flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <label className="text-[11px] font-semibold uppercase text-foreground">Shortcut</label>
          <Input
            value={shortcut}
            onChange={(e) => setShortcut(e.target.value)}
            placeholder="/hello"
            className="h-10 rounded-lg border-[#e0e0e0] text-sm"
          />
        </div>
        <div className="min-w-0 flex-[2] space-y-1.5">
          <label className="text-[11px] font-semibold uppercase text-foreground">Isi Pesan</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Halo, ada yang bisa dibantu?"
            className="min-h-10 rounded-lg border-[#e0e0e0] text-sm"
          />
        </div>
        <Button type="submit" variant="primary" size="sm" className="shrink-0" loading={isPending}>
          Tambah
        </Button>
      </form>

      {replies.length === 0 ? (
        <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-16 text-foreground">
          <p className="text-sm font-semibold uppercase">Belum ada quick reply</p>
        </div>
      ) : (
        <div className="admin-utility-card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e0e0e0] bg-muted/30">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-foreground">
                    Shortcut
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-foreground">
                    Isi Pesan
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-foreground">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {replies.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-primary">{r.shortcut}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="line-clamp-2 max-w-md text-sm">{r.content}</p>
                    </td>
                    <td className="px-4 py-3">
                      <AdminTableDeleteButton onClick={() => handleDelete(r.id)} disabled={isPending}>
                        Hapus
                      </AdminTableDeleteButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Deferred to Task 7 (needs `page.tsx` to render it).

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(panel)/chat/quick-replies/_components/quick-reply-manager.tsx"
git commit -m "feat: add quick-reply CRUD manager component"
```

---

### Task 7: Quick Replies admin page

**Files:**
- Create: `app/admin/(panel)/chat/quick-replies/page.tsx`

**Interfaces:**
- Consumes: `getChatAutoReplySettings` (Task 2), `AutoReplyForm` (Task 5), `QuickReplyManager` (Task 6), `createClient` from `@/lib/supabase/server`
- Produces: the `/admin/chat/quick-replies` route — used by Task 8 (link from Chat Inbox)

- [ ] **Step 1: Write the page**

```tsx
// app/admin/(panel)/chat/quick-replies/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getChatAutoReplySettings } from "@/lib/settings/queries";
import { AutoReplyForm } from "./_components/auto-reply-form";
import { QuickReplyManager } from "./_components/quick-reply-manager";
import type { ChatQuickReply } from "@/types/chat";

export const metadata: Metadata = { title: "Quick Replies — Admin GeekyTech" };
export const dynamic = "force-dynamic";

export default async function AdminChatQuickRepliesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/admin/login");

  const [{ enabled, template }, { data: quickReplies }] = await Promise.all([
    getChatAutoReplySettings(),
    supabase.from("chat_quick_replies").select("*").order("shortcut"),
  ]);

  return (
    <div className="w-full space-y-6">
      <div>
        <Link
          href="/admin/chat"
          className="admin-text-link mb-2 inline-flex items-center gap-1 text-xs font-medium"
        >
          <ChevronLeft size={14} />
          Chat Inbox
        </Link>
        <p className="text-swiss-eyebrow">Dukungan</p>
        <h1 className="text-[34px] font-semibold uppercase text-foreground">Quick Replies</h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
          Kelola pesan sambutan otomatis dan pesan kalengan untuk chat admin.
        </p>
      </div>

      <AutoReplyForm initialEnabled={enabled} initialTemplate={template} />
      <QuickReplyManager initialReplies={(quickReplies ?? []) as ChatQuickReply[]} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

1. Start the dev server, log in as admin, navigate to `/admin/chat/quick-replies` directly.
2. Confirm the "Auto-Reply" card renders with the current toggle state and template pre-filled, and the preview line updates live as you edit the textarea.
3. Toggle it off, click Simpan, confirm a success toast; reload the page, confirm the toggle is still off (persisted).
4. Toggle it back on, edit the template to include `{{name}}` and `{{subject}}`, save, reload, confirm the edited text persisted.
5. In the Quick Replies section: add a new shortcut/content pair, confirm it appears in the table without a full page reload; delete it, confirm it disappears and a toast fires.
6. As a non-admin user, try navigating to `/admin/chat/quick-replies` directly — confirm redirect to `/admin/login`.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(panel)/chat/quick-replies/page.tsx"
git commit -m "feat: add Quick Replies admin page"
```

---

### Task 8: Link to the new page from Chat Inbox

**Files:**
- Modify: `app/admin/(panel)/chat/page.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: nothing consumed by later tasks (final task)

- [ ] **Step 1: Add the header link**

Current file:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AdminChatInbox } from "@/components/admin/admin-chat-inbox";
import type { ChatSession } from "@/types/chat";
```

Change the imports to add `Link` and `Button`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AdminChatInbox } from "@/components/admin/admin-chat-inbox";
import { Button } from "@/components/ui/button";
import type { ChatSession } from "@/types/chat";
```

Replace the header block:

```tsx
      <div>
        <p className="text-swiss-eyebrow">Dukungan</p>
        <h1 className="text-[34px] font-semibold uppercase text-foreground">Chat Inbox</h1>
      </div>
```

with:

```tsx
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Dukungan</p>
          <h1 className="text-[34px] font-semibold uppercase text-foreground">Chat Inbox</h1>
        </div>
        <Button asChild variant="primary" size="sm" className="shrink-0">
          <Link href="/admin/chat/quick-replies">Kelola Quick Reply</Link>
        </Button>
      </div>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Navigate to `/admin/chat` as admin, confirm the "Kelola Quick Reply" button renders next to the title and navigates to `/admin/chat/quick-replies` when clicked.

- [ ] **Step 4: Commit**

```bash
git add "app/admin/(panel)/chat/page.tsx"
git commit -m "feat: link Chat Inbox to Quick Replies management page"
```

---

## Self-Review

**Spec coverage:** trigger (Task 3), bubble-not-system rendering + sender_id decision (Task 3 + Global Constraints), personalization/copywriting default template (Task 2), on/off + editable template (Task 2/4/5), UI location bundling quick-reply CRUD (Task 6/7/8), no new migration (confirmed throughout), error handling/edge cases — no admin found, empty template, disabled toggle, missing full_name (all handled in Task 3's try/catch and Task 2's fallbacks) — all covered.

**Placeholder scan:** no TBD/TODO; every step has complete code.

**Type consistency:** `renderAutoReplyTemplate(template, { name, subject })` signature identical across Task 1 (definition), Task 3 (route usage), Task 5 (preview usage). `ChatAutoReplySettings { enabled, template }` identical across Task 2 (definition) and Task 7 (destructured usage). `saveChatAutoReplySettings(enabled, template)` identical across Task 4 (definition) and Task 5 (call site). `ChatQuickReply` reused from existing `types/chat.ts` — no redefinition drift.
