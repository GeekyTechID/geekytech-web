# Chat System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time in-app chat system between users and admin, replacing the WhatsApp floating button.

**Architecture:** Supabase Realtime for live messages, Supabase Presence for typing indicators, Supabase Storage for file attachments. Ticket-based (1 active session per user). Admin sees all sessions in 1 inbox panel.

**Tech Stack:** Next.js 15 App Router, Supabase (Realtime + Storage + RLS), Zustand, shadcn/ui, GSAP, TypeScript

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/018_chat_system.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/018_chat_system.sql
-- Chat system: sessions, messages, attachments, quick_replies

-- chat_sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  subject     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  closed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions (user_id);
CREATE INDEX IF NOT EXISTS chat_sessions_status_idx ON chat_sessions (status);
CREATE INDEX IF NOT EXISTS chat_sessions_updated_at_idx ON chat_sessions (updated_at DESC);

-- chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role  text NOT NULL CHECK (sender_role IN ('user', 'admin', 'system')),
  content      text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  reactions    jsonb NOT NULL DEFAULT '{}',
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS chat_messages_unread_idx ON chat_messages (is_read) WHERE is_read = false;

-- chat_attachments
CREATE TABLE IF NOT EXISTS chat_attachments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_url   text NOT NULL,
  file_name  text NOT NULL,
  file_type  text NOT NULL,
  file_size  integer NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_attachments_message_idx ON chat_attachments (message_id);

-- chat_quick_replies (admin canned responses)
CREATE TABLE IF NOT EXISTS chat_quick_replies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcut   text NOT NULL,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_quick_replies ENABLE ROW LEVEL SECURITY;

-- chat_sessions policies
CREATE POLICY "chat_sessions_user_own" ON chat_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_sessions_admin_all" ON chat_sessions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- chat_messages policies
CREATE POLICY "chat_messages_user_own_session" ON chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM chat_sessions cs WHERE cs.id = session_id AND cs.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM chat_sessions cs WHERE cs.id = session_id AND cs.user_id = auth.uid())
  );

CREATE POLICY "chat_messages_admin_all" ON chat_messages
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- chat_attachments policies
CREATE POLICY "chat_attachments_user_own" ON chat_attachments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_sessions cs ON cs.id = cm.session_id
      WHERE cm.id = message_id AND cs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_sessions cs ON cs.id = cm.session_id
      WHERE cm.id = message_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_attachments_admin_all" ON chat_attachments
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- chat_quick_replies: admin only
CREATE POLICY "chat_quick_replies_admin_all" ON chat_quick_replies
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Trigger: update chat_sessions.updated_at on new message
CREATE OR REPLACE FUNCTION update_chat_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions SET updated_at = now() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chat_messages_update_session
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_session_on_message();

-- Storage bucket (public for simplicity; RLS on table is the real guard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chat_attachments_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "chat_attachments_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```

Expected: migration applies without error, 4 new tables visible in Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/018_chat_system.sql
git commit -m "feat(db): add chat system tables and RLS policies"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `types/chat.ts`

- [ ] **Step 1: Create types file**

```typescript
// types/chat.ts
export type ChatSessionStatus = "open" | "resolved";
export type ChatSenderRole = "user" | "admin" | "system";
export type ChatMessageType = "text" | "image" | "file" | "system";

export type ChatSession = {
  id: string;
  user_id: string;
  status: ChatSessionStatus;
  subject: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  // joined
  profile?: { full_name: string | null; avatar_url: string | null; email?: string };
};

export type ChatAttachment = {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
};

export type ChatMessage = {
  id: string;
  session_id: string;
  sender_id: string;
  sender_role: ChatSenderRole;
  content: string | null;
  message_type: ChatMessageType;
  reactions: Record<string, string[]>; // { "👍": ["user_id_1"] }
  is_read: boolean;
  created_at: string;
  attachments?: ChatAttachment[];
};

export type ChatQuickReply = {
  id: string;
  shortcut: string;
  content: string;
  created_at: string;
};

export type PendingAttachment = {
  file: File;
  preview_url: string; // object URL for images
};

export const ALLOWED_CHAT_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const CHAT_SIZE_LIMITS: Record<string, number> = {
  image: 500 * 1024,       // 500 KB
  document: 1024 * 1024,   // 1 MB
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in `types/chat.ts`.

- [ ] **Step 3: Commit**

```bash
git add types/chat.ts
git commit -m "feat(types): add chat system TypeScript types"
```

---

## Task 3: Zustand chatStore

**Files:**
- Create: `store/chat-store.ts`

- [ ] **Step 1: Create store**

```typescript
// store/chat-store.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ChatSession, ChatMessage } from "@/types/chat";

type ChatState = {
  isOpen: boolean;
  activeSession: ChatSession | null;
  messages: ChatMessage[];
  unreadCount: number;
  isRemoteTyping: boolean;
};

type ChatActions = {
  setOpen: (open: boolean) => void;
  setActiveSession: (session: ChatSession | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setUnreadCount: (count: number) => void;
  setRemoteTyping: (typing: boolean) => void;
  reset: () => void;
};

export type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  isOpen: false,
  activeSession: null,
  messages: [],
  unreadCount: 0,
  isRemoteTyping: false,
};

export const useChatStore = create<ChatStore>()(
  devtools(
    (set) => ({
      ...initialState,
      setOpen: (isOpen) => set({ isOpen }, false, "setOpen"),
      setActiveSession: (activeSession) => set({ activeSession }, false, "setActiveSession"),
      setMessages: (messages) => set({ messages }, false, "setMessages"),
      addMessage: (message) =>
        set((s) => ({ messages: [...s.messages, message] }), false, "addMessage"),
      updateMessage: (id, patch) =>
        set(
          (s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) }),
          false,
          "updateMessage",
        ),
      setUnreadCount: (unreadCount) => set({ unreadCount }, false, "setUnreadCount"),
      setRemoteTyping: (isRemoteTyping) => set({ isRemoteTyping }, false, "setRemoteTyping"),
      reset: () => set(initialState, false, "reset"),
    }),
    { name: "chat-store" },
  ),
);

export const selectChatIsOpen = (s: ChatStore) => s.isOpen;
export const selectActiveSession = (s: ChatStore) => s.activeSession;
export const selectChatMessages = (s: ChatStore) => s.messages;
export const selectChatUnread = (s: ChatStore) => s.unreadCount;
export const selectRemoteTyping = (s: ChatStore) => s.isRemoteTyping;
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add store/chat-store.ts
git commit -m "feat(store): add chat Zustand store"
```

---

## Task 4: API — User Sessions

**Files:**
- Create: `app/api/chat/sessions/route.ts`
- Create: `app/api/chat/sessions/[id]/route.ts`
- Create: `app/api/chat/sessions/[id]/messages/route.ts`
- Create: `app/api/chat/sessions/[id]/read/route.ts`
- Create: `app/api/chat/messages/[id]/react/route.ts`

- [ ] **Step 1: Create `app/api/chat/sessions/route.ts`**

```typescript
// app/api/chat/sessions/route.ts
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";

const CreateSchema = z.object({
  subject: z.string().min(3).max(200),
});

// GET: get user's active (open) session
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { data } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return Response.json({ success: true, data });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

// POST: create new session (only if no open session exists)
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    // Check no open session
    const { data: existing } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "open")
      .maybeSingle();

    if (existing) {
      return Response.json({ success: false, error: "Sudah ada sesi aktif" }, { status: 409 });
    }

    const svc = createServiceClient();
    const { data: session, error } = await svc
      .from("chat_sessions")
      .insert({ user_id: user.id, subject: parsed.data.subject })
      .select()
      .single();

    if (error || !session) {
      return Response.json({ success: false, error: "Gagal membuat sesi" }, { status: 500 });
    }

    // System message: sesi dimulai
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
      title: "Chat baru",
      body: `${profile?.full_name ?? "Pelanggan"} membuka sesi: ${parsed.data.subject}`,
      type: "chat_new_session",
      data: { session_id: session.id },
    });

    return Response.json({ success: true, data: session }, { status: 201 });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `app/api/chat/sessions/[id]/route.ts`**

```typescript
// app/api/chat/sessions/[id]/route.ts
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";

// GET: get session detail (user must own it or be admin)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { data } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (!data) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    return Response.json({ success: true, data });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

// PATCH: close session (admin only)
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const svc = createServiceClient();

    // Get session to find user_id
    const { data: session } = await svc
      .from("chat_sessions")
      .select("user_id, status")
      .eq("id", id)
      .single();

    if (!session) return Response.json({ success: false, error: "Not found" }, { status: 404 });
    if (session.status === "resolved") {
      return Response.json({ success: false, error: "Sesi sudah ditutup" }, { status: 409 });
    }

    // Update session
    await svc
      .from("chat_sessions")
      .update({ status: "resolved", closed_at: new Date().toISOString() })
      .eq("id", id);

    // System message
    await svc.from("chat_messages").insert({
      session_id: id,
      sender_id: user.id,
      sender_role: "system",
      content: "Sesi chat telah ditutup oleh admin.",
      message_type: "system",
    });

    // Notify user
    await createNotification({
      userId: session.user_id,
      title: "Sesi chat ditutup",
      body: "Admin telah menutup sesi chat kamu. Kamu bisa membuka sesi baru kapan saja.",
      type: "chat_session_closed",
      data: { session_id: id },
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create `app/api/chat/sessions/[id]/messages/route.ts`**

```typescript
// app/api/chat/sessions/[id]/messages/route.ts
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";

const SendSchema = z.object({
  content: z.string().max(2000).optional(),
  message_type: z.enum(["text", "image", "file"]).default("text"),
  attachment: z
    .object({
      file_url: z.string().url(),
      file_name: z.string(),
      file_type: z.string(),
      file_size: z.number(),
    })
    .optional(),
});

// GET: message history
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { data: messages } = await supabase
      .from("chat_messages")
      .select("*, attachments:chat_attachments(*)")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    return Response.json({ success: true, data: messages ?? [] });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

// POST: send message
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = SendSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }
    if (!parsed.data.content && !parsed.data.attachment) {
      return Response.json({ success: false, error: "Pesan tidak boleh kosong" }, { status: 400 });
    }

    // Verify session access
    const { data: session } = await supabase
      .from("chat_sessions")
      .select("user_id, status")
      .eq("id", id)
      .single();

    if (!session) return Response.json({ success: false, error: "Sesi tidak ditemukan" }, { status: 404 });
    if (session.status === "resolved") {
      return Response.json({ success: false, error: "Sesi sudah ditutup" }, { status: 409 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const senderRole = profile?.role === "admin" ? "admin" : "user";

    const svc = createServiceClient();
    const { data: message, error } = await svc
      .from("chat_messages")
      .insert({
        session_id: id,
        sender_id: user.id,
        sender_role: senderRole,
        content: parsed.data.content ?? null,
        message_type: parsed.data.message_type,
      })
      .select()
      .single();

    if (error || !message) {
      return Response.json({ success: false, error: "Gagal mengirim pesan" }, { status: 500 });
    }

    // Insert attachment if present
    if (parsed.data.attachment) {
      await svc.from("chat_attachments").insert({
        message_id: message.id,
        ...parsed.data.attachment,
      });
    }

    // Notify the other party
    if (senderRole === "user") {
      await createAdminNotification({
        title: "Pesan chat baru",
        body: `${profile?.full_name ?? "Pelanggan"}: ${parsed.data.content ?? "[file]"}`,
        type: "chat_message_user",
        data: { session_id: id },
      });
    } else {
      await createNotification({
        userId: session.user_id,
        title: "Balasan dari Admin",
        body: parsed.data.content ?? "[file]",
        type: "chat_message",
        data: { session_id: id },
      });
    }

    return Response.json({ success: true, data: message }, { status: 201 });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create `app/api/chat/sessions/[id]/read/route.ts`**

```typescript
// app/api/chat/sessions/[id]/read/route.ts
import { createClient, createServiceClient } from "@/lib/supabase/server";

// PATCH: mark all messages from the other side as read
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const myRole = profile?.role === "admin" ? "admin" : "user";
    const otherRole = myRole === "admin" ? "user" : "admin";

    const svc = createServiceClient();
    await svc
      .from("chat_messages")
      .update({ is_read: true })
      .eq("session_id", id)
      .eq("sender_role", otherRole)
      .eq("is_read", false);

    return Response.json({ success: true });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Create `app/api/chat/messages/[id]/react/route.ts`**

```typescript
// app/api/chat/messages/[id]/react/route.ts
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

const ReactSchema = z.object({
  emoji: z.enum(ALLOWED_EMOJIS),
});

// PATCH: toggle emoji reaction
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = ReactSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ success: false, error: "Invalid emoji" }, { status: 400 });
    }

    const { emoji } = parsed.data;
    const { data: message } = await supabase
      .from("chat_messages")
      .select("reactions")
      .eq("id", id)
      .single();

    if (!message) return Response.json({ success: false, error: "Not found" }, { status: 404 });

    const reactions = (message.reactions as Record<string, string[]>) ?? {};
    const current = reactions[emoji] ?? [];
    const hasReacted = current.includes(user.id);

    const updated = {
      ...reactions,
      [emoji]: hasReacted
        ? current.filter((uid) => uid !== user.id)
        : [...current, user.id],
    };
    // Clean up empty arrays
    if (updated[emoji].length === 0) delete updated[emoji];

    const svc = createServiceClient();
    await svc.from("chat_messages").update({ reactions: updated }).eq("id", id);

    return Response.json({ success: true, data: updated });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/chat/
git commit -m "feat(api): add chat sessions and messages endpoints"
```

---

## Task 5: API — File Upload

**Files:**
- Create: `app/api/chat/upload/route.ts`

- [ ] **Step 1: Create upload route**

```typescript
// app/api/chat/upload/route.ts
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ALLOWED_CHAT_FILE_TYPES, CHAT_SIZE_LIMITS } from "@/types/chat";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return Response.json({ success: false, error: "No file" }, { status: 400 });

    // Validate type
    if (!ALLOWED_CHAT_FILE_TYPES.includes(file.type as never)) {
      return Response.json(
        { success: false, error: "Tipe file tidak diizinkan" },
        { status: 400 },
      );
    }

    // Validate size
    const isImage = file.type.startsWith("image/");
    const limit = isImage ? CHAT_SIZE_LIMITS.image : CHAT_SIZE_LIMITS.document;
    if (file.size > limit) {
      const limitLabel = isImage ? "500 KB" : "1 MB";
      return Response.json(
        { success: false, error: `Ukuran file maks ${limitLabel}` },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const svc = createServiceClient();
    const { error } = await svc.storage
      .from("chat-attachments")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      return Response.json({ success: false, error: "Upload gagal" }, { status: 500 });
    }

    const { data: urlData } = svc.storage.from("chat-attachments").getPublicUrl(path);

    return Response.json({
      success: true,
      data: {
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      },
    });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/chat/upload/route.ts
git commit -m "feat(api): add chat file upload endpoint"
```

---

## Task 6: API — Admin Chat

**Files:**
- Create: `app/api/admin/chat/sessions/route.ts`
- Create: `app/api/admin/chat/quick-replies/route.ts`

- [ ] **Step 1: Create `app/api/admin/chat/sessions/route.ts`**

```typescript
// app/api/admin/chat/sessions/route.ts
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // 'open' | 'resolved' | null = all

    const svc = createServiceClient();
    let query = svc
      .from("chat_sessions")
      .select(
        `*, profile:profiles!chat_sessions_user_id_fkey(full_name, avatar_url, email:id)`,
      )
      .order("updated_at", { ascending: false })
      .limit(100);

    if (status === "open" || status === "resolved") {
      query = query.eq("status", status);
    }

    const { data } = await query;
    return Response.json({ success: true, data: data ?? [] });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `app/api/admin/chat/quick-replies/route.ts`**

```typescript
// app/api/admin/chat/quick-replies/route.ts
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const QuickReplySchema = z.object({
  shortcut: z.string().min(1).max(50),
  content: z.string().min(1).max(1000),
});

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return data?.role === "admin";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!(await verifyAdmin(supabase, user.id))) {
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { data } = await supabase
      .from("chat_quick_replies")
      .select("*")
      .order("shortcut");

    return Response.json({ success: true, data: data ?? [] });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!(await verifyAdmin(supabase, user.id))) {
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = QuickReplySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const svc = createServiceClient();
    const { data } = await svc
      .from("chat_quick_replies")
      .insert(parsed.data)
      .select()
      .single();

    return Response.json({ success: true, data }, { status: 201 });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!(await verifyAdmin(supabase, user.id))) {
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return Response.json({ success: false, error: "id required" }, { status: 400 });

    const svc = createServiceClient();
    await svc.from("chat_quick_replies").delete().eq("id", id);

    return Response.json({ success: true });
  } catch {
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/chat/
git commit -m "feat(api): add admin chat sessions and quick-replies endpoints"
```

---

## Task 7: Realtime Hooks

**Files:**
- Create: `lib/chat/use-chat-realtime.ts`
- Create: `lib/chat/use-chat-presence.ts`

- [ ] **Step 1: Create `lib/chat/use-chat-realtime.ts`**

```typescript
// lib/chat/use-chat-realtime.ts
"use client";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, ChatSession } from "@/types/chat";

type Options = {
  sessionId: string | null;
  onNewMessage: (msg: ChatMessage) => void;
  onSessionUpdate: (session: Partial<ChatSession>) => void;
  onMessageUpdate?: (msg: Partial<ChatMessage> & { id: string }) => void;
};

export function useChatRealtime({
  sessionId,
  onNewMessage,
  onSessionUpdate,
  onMessageUpdate,
}: Options) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`chat-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => onNewMessage(payload.new as ChatMessage),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => onMessageUpdate?.({ ...(payload.new as ChatMessage) }),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => onSessionUpdate(payload.new as Partial<ChatSession>),
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, onNewMessage, onSessionUpdate, onMessageUpdate]);
}

// Hook for admin: subscribe to all session changes
export function useAdminChatRealtime(onSessionChange: () => void) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-chat-sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        onSessionChange,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onSessionChange]);
}
```

- [ ] **Step 2: Create `lib/chat/use-chat-presence.ts`**

```typescript
// lib/chat/use-chat-presence.ts
"use client";
import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type PresenceState = { typing: boolean; sender_role: string };

type Options = {
  sessionId: string | null;
  myRole: "user" | "admin";
  onRemoteTyping: (typing: boolean) => void;
};

export function useChatPresence({ sessionId, myRole, onRemoteTyping }: Options) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const channel = supabase.channel(`chat-presence-${sessionId}`, {
      config: { presence: { key: myRole } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const otherRole = myRole === "user" ? "admin" : "user";
        const otherState = state[otherRole];
        const isTyping = Array.isArray(otherState) && otherState.some((s) => s.typing);
        onRemoteTyping(isTyping);
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, myRole, onRemoteTyping]);

  const sendTyping = useCallback(() => {
    if (!channelRef.current) return;
    channelRef.current.track({ typing: true, sender_role: myRole });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      channelRef.current?.track({ typing: false, sender_role: myRole });
    }, 3000);
  }, [myRole]);

  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    channelRef.current?.track({ typing: false, sender_role: myRole });
  }, [myRole]);

  return { sendTyping, stopTyping };
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/chat/
git commit -m "feat(hooks): add chat realtime and presence hooks"
```

---

## Task 8: Chat UI Components — Base

**Files:**
- Create: `components/chat/chat-session-form.tsx`
- Create: `components/chat/chat-typing-indicator.tsx`
- Create: `components/chat/emoji-reaction-picker.tsx`
- Create: `components/chat/chat-attachment-preview.tsx`

- [ ] **Step 1: Create `components/chat/chat-session-form.tsx`**

```tsx
// components/chat/chat-session-form.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle } from "lucide-react";

type Props = {
  onCreated: (sessionId: string) => void;
};

export function ChatSessionForm({ onCreated }: Props) {
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (subject.trim().length < 3) {
      setError("Topik minimal 3 karakter");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Gagal membuat sesi");
        return;
      }
      onCreated(json.data.id);
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <MessageCircle size={18} className="text-primary" />
        <span className="text-sm font-semibold">Chat dengan Admin</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Ceritakan topik yang ingin kamu tanyakan.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Topik (misal: pertanyaan produk, status pesanan...)"
          maxLength={200}
          disabled={loading}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={loading || subject.trim().length < 3}>
          {loading ? "Memulai..." : "Mulai Chat"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/chat/chat-typing-indicator.tsx`**

```tsx
// components/chat/chat-typing-indicator.tsx
"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function ChatTypingIndicator() {
  const dotRefs = [
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
    useRef<HTMLSpanElement>(null),
  ];

  useEffect(() => {
    const tl = gsap.timeline({ repeat: -1 });
    dotRefs.forEach((ref, i) => {
      if (!ref.current) return;
      tl.to(ref.current, { y: -4, duration: 0.3, ease: "power1.out" }, i * 0.15)
        .to(ref.current, { y: 0, duration: 0.3, ease: "power1.in" }, i * 0.15 + 0.3);
    });
    return () => { tl.kill(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-muted w-fit">
      {dotRefs.map((ref, i) => (
        <span
          key={i}
          ref={ref}
          className="block h-1.5 w-1.5 rounded-full bg-muted-foreground"
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `components/chat/emoji-reaction-picker.tsx`**

```tsx
// components/chat/emoji-reaction-picker.tsx
"use client";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

type Props = {
  onSelect: (emoji: string) => void;
};

export function EmojiReactionPicker({ onSelect }: Props) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-background px-1 py-0.5 shadow-md">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="rounded-full p-1 text-base transition-transform hover:scale-125 focus:outline-none"
          aria-label={`React ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `components/chat/chat-attachment-preview.tsx`**

```tsx
// components/chat/chat-attachment-preview.tsx
"use client";
import { X, FileText } from "lucide-react";
import type { PendingAttachment } from "@/types/chat";

type Props = {
  attachment: PendingAttachment;
  onRemove: () => void;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatAttachmentPreview({ attachment, onRemove }: Props) {
  const isImage = attachment.file.type.startsWith("image/");

  return (
    <div className="relative flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2 pr-8">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachment.preview_url}
          alt={attachment.file.name}
          className="h-10 w-10 rounded object-cover"
        />
      ) : (
        <FileText size={20} className="shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{attachment.file.name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(attachment.file.size)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full p-0.5 hover:bg-muted"
        aria-label="Hapus lampiran"
      >
        <X size={12} />
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add components/chat/chat-session-form.tsx components/chat/chat-typing-indicator.tsx components/chat/emoji-reaction-picker.tsx components/chat/chat-attachment-preview.tsx
git commit -m "feat(ui): add chat base components (session form, typing, emoji, attachment)"
```

---

## Task 9: ChatMessageItem

**Files:**
- Create: `components/chat/chat-message-item.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/chat/chat-message-item.tsx
"use client";
import { useState } from "react";
import Image from "next/image";
import { FileText, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmojiReactionPicker } from "./emoji-reaction-picker";
import type { ChatMessage } from "@/types/chat";

type Props = {
  message: ChatMessage;
  myUserId: string;
  onReact: (messageId: string, emoji: string) => void;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatMessageItem({ message, myUserId, onReact }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  if (message.sender_role === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  const isMine = message.sender_id === myUserId;
  const attachment = message.attachments?.[0];
  const isImage = attachment?.file_type.startsWith("image/");
  const reactions = (message.reactions ?? {}) as Record<string, string[]>;
  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div className={cn("group flex flex-col gap-0.5 my-1", isMine ? "items-end" : "items-start")}>
      <div className="relative max-w-[75%]">
        {/* Reaction picker trigger */}
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className={cn(
            "absolute top-0 z-10 hidden group-hover:flex items-center justify-center",
            "h-6 w-6 rounded-full border border-border bg-background shadow-sm text-xs",
            isMine ? "-left-7" : "-right-7",
          )}
          aria-label="Tambah reaksi"
        >
          😊
        </button>

        {showPicker && (
          <div
            className={cn(
              "absolute bottom-full z-20 mb-1",
              isMine ? "right-0" : "left-0",
            )}
          >
            <EmojiReactionPicker
              onSelect={(emoji) => {
                onReact(message.id, emoji);
                setShowPicker(false);
              }}
            />
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm",
            isMine
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm bg-muted text-foreground",
          )}
        >
          {/* Image attachment */}
          {attachment && isImage && (
            <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
              <Image
                src={attachment.file_url}
                alt={attachment.file_name}
                width={200}
                height={150}
                className="mb-1 rounded-lg object-cover"
              />
            </a>
          )}

          {/* File attachment */}
          {attachment && !isImage && (
            <a
              href={attachment.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-1 flex items-center gap-2 rounded-lg border border-border/40 bg-black/5 p-2"
            >
              <FileText size={16} className="shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{attachment.file_name}</p>
                <p className="text-[10px] opacity-70">{formatBytes(attachment.file_size)}</p>
              </div>
            </a>
          )}

          {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
        </div>
      </div>

      {/* Reactions display */}
      {hasReactions && (
        <div className="flex flex-wrap gap-0.5 px-1">
          {Object.entries(reactions).map(([emoji, uids]) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(message.id, emoji)}
              className={cn(
                "flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs",
                uids.includes(myUserId)
                  ? "border-primary/30 bg-primary/10"
                  : "border-border bg-muted/40",
              )}
            >
              <span>{emoji}</span>
              {uids.length > 1 && <span className="text-[10px]">{uids.length}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Timestamp + read receipt */}
      <div className={cn("flex items-center gap-1 px-1", isMine ? "flex-row-reverse" : "flex-row")}>
        <span className="text-[10px] text-muted-foreground">{formatTime(message.created_at)}</span>
        {isMine && (
          message.is_read
            ? <CheckCheck size={12} className="text-primary" />
            : <Check size={12} className="text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/chat/chat-message-item.tsx
git commit -m "feat(ui): add chat message item component with reactions and read receipts"
```

---

## Task 10: ChatInput

**Files:**
- Create: `components/chat/chat-input.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/chat/chat-input.tsx
"use client";
import { useRef, useState } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChatAttachmentPreview } from "./chat-attachment-preview";
import {
  ALLOWED_CHAT_FILE_TYPES,
  CHAT_SIZE_LIMITS,
  type PendingAttachment,
} from "@/types/chat";
import { cn } from "@/lib/utils";

type Props = {
  onSend: (content: string, attachment?: PendingAttachment) => Promise<void>;
  onTyping: () => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, onTyping, disabled }: Props) {
  const [content, setContent] = useState("");
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileRef.current) fileRef.current!.value = "";
    if (!file) return;

    if (!ALLOWED_CHAT_FILE_TYPES.includes(file.type as never)) {
      toast.error("Tipe file tidak diizinkan (gambar, PDF, Word)");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const limit = isImage ? CHAT_SIZE_LIMITS.image : CHAT_SIZE_LIMITS.document;
    if (file.size > limit) {
      toast.error(`Ukuran file maks ${isImage ? "500 KB" : "1 MB"}`);
      return;
    }

    const preview_url = isImage ? URL.createObjectURL(file) : "";
    setPending({ file, preview_url });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSend() {
    if ((!content.trim() && !pending) || sending) return;
    setSending(true);
    try {
      await onSend(content.trim(), pending ?? undefined);
      setContent("");
      setPending((prev) => {
        if (prev?.preview_url) URL.revokeObjectURL(prev.preview_url);
        return null;
      });
      textRef.current?.focus();
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-border bg-background p-3">
      {pending && (
        <div className="mb-2">
          <ChatAttachmentPreview
            attachment={pending}
            onRemove={() => {
              if (pending.preview_url) URL.revokeObjectURL(pending.preview_url);
              setPending(null);
            }}
          />
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept={ALLOWED_CHAT_FILE_TYPES.join(",")}
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || !!pending}
          className={cn(
            "shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
            (disabled || !!pending) && "opacity-50 cursor-not-allowed",
          )}
          aria-label="Lampirkan file"
        >
          <Paperclip size={18} />
        </button>

        <textarea
          ref={textRef}
          value={content}
          onChange={(e) => { setContent(e.target.value); onTyping(); }}
          onKeyDown={handleKeyDown}
          placeholder="Ketik pesan..."
          rows={1}
          disabled={disabled || sending}
          className={cn(
            "flex-1 resize-none rounded-2xl border border-border bg-muted/40 px-3 py-2 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary",
            "max-h-28 overflow-y-auto",
          )}
          style={{ height: "auto" }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
          }}
        />

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={(!content.trim() && !pending) || disabled || sending}
          className="shrink-0 rounded-full"
          aria-label="Kirim"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/chat/chat-input.tsx
git commit -m "feat(ui): add chat input component with file upload and auto-resize"
```

---

## Task 11: ChatPopup

**Files:**
- Create: `components/chat/chat-popup.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/chat/chat-popup.tsx
"use client";
import { useCallback, useEffect, useRef } from "react";
import { X, ChevronDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatMessageItem } from "./chat-message-item";
import { ChatInput } from "./chat-input";
import { ChatTypingIndicator } from "./chat-typing-indicator";
import { useChatStore } from "@/store/chat-store";
import { useChatRealtime } from "@/lib/chat/use-chat-realtime";
import { useChatPresence } from "@/lib/chat/use-chat-presence";
import { useAuthStore } from "@/store/auth-store";
import type { ChatMessage, ChatSession, PendingAttachment } from "@/types/chat";

type Props = {
  onMinimize: () => void;
};

export function ChatPopup({ onMinimize }: Props) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const {
    activeSession,
    messages,
    isRemoteTyping,
    setActiveSession,
    setMessages,
    addMessage,
    updateMessage,
    setRemoteTyping,
  } = useChatStore();

  const bottomRef = useRef<HTMLDivElement>(null);
  const myRole = profile?.role === "admin" ? "admin" : "user";

  // Fetch messages on mount
  useEffect(() => {
    if (!activeSession?.id) return;
    fetch(`/api/chat/sessions/${activeSession.id}/messages`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setMessages(json.data); });

    // Mark read
    fetch(`/api/chat/sessions/${activeSession.id}/read`, { method: "PATCH" });
  }, [activeSession?.id, setMessages]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRemoteTyping]);

  // Realtime
  const handleNewMessage = useCallback(
    (msg: ChatMessage) => {
      addMessage(msg);
      // Mark read if from other side
      if (msg.sender_id !== user?.id) {
        fetch(`/api/chat/sessions/${activeSession!.id}/read`, { method: "PATCH" });
      }
    },
    [addMessage, user?.id, activeSession],
  );

  const handleSessionUpdate = useCallback(
    (patch: Partial<ChatSession>) => {
      if (patch.status) setActiveSession({ ...activeSession!, ...patch });
    },
    [activeSession, setActiveSession],
  );

  useChatRealtime({
    sessionId: activeSession?.id ?? null,
    onNewMessage: handleNewMessage,
    onSessionUpdate: handleSessionUpdate,
    onMessageUpdate: (patch) => updateMessage(patch.id, patch),
  });

  const { sendTyping } = useChatPresence({
    sessionId: activeSession?.id ?? null,
    myRole,
    onRemoteTyping: setRemoteTyping,
  });

  async function handleSend(content: string, attachment?: PendingAttachment) {
    if (!activeSession) return;

    let attachmentData: { file_url: string; file_name: string; file_type: string; file_size: number } | undefined;

    if (attachment) {
      const fd = new FormData();
      fd.append("file", attachment.file);
      const res = await fetch("/api/chat/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) { toast.error(json.error ?? "Upload gagal"); return; }
      attachmentData = json.data;
    }

    const messageType = attachmentData
      ? attachmentData.file_type.startsWith("image/") ? "image" : "file"
      : "text";

    const res = await fetch(`/api/chat/sessions/${activeSession.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content || null, message_type: messageType, attachment: attachmentData }),
    });
    const json = await res.json();
    if (!json.success) toast.error(json.error ?? "Gagal mengirim");
  }

  async function handleReact(messageId: string, emoji: string) {
    await fetch(`/api/chat/messages/${messageId}/react`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
  }

  async function handleCloseSession() {
    if (!activeSession) return;
    const res = await fetch(`/api/chat/sessions/${activeSession.id}`, { method: "PATCH" });
    const json = await res.json();
    if (!json.success) toast.error(json.error ?? "Gagal menutup sesi");
  }

  const isResolved = activeSession?.status === "resolved";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate max-w-[180px]">
            {activeSession?.subject ?? "Chat"}
          </span>
          <Badge variant={isResolved ? "secondary" : "default"} className="text-[10px]">
            {isResolved ? "Selesai" : "Aktif"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {!isResolved && myRole === "admin" && (
            <Button variant="ghost" size="sm" onClick={handleCloseSession} className="text-xs h-7">
              Tutup Sesi
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onMinimize} aria-label="Minimize">
            <ChevronDown size={16} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            myUserId={user?.id ?? ""}
            onReact={handleReact}
          />
        ))}
        {isRemoteTyping && (
          <div className="mb-2">
            <ChatTypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Resolved state */}
      {isResolved ? (
        <div className="flex items-center gap-2 border-t border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <AlertCircle size={14} className="shrink-0" />
          Sesi ini telah ditutup. Buka sesi baru untuk mulai chat.
        </div>
      ) : (
        <ChatInput onSend={handleSend} onTyping={sendTyping} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/chat/chat-popup.tsx
git commit -m "feat(ui): add chat popup component with realtime, typing, reactions"
```

---

## Task 12: ChatWidget (Floating Button)

**Files:**
- Create: `components/chat/chat-widget.tsx`

- [ ] **Step 1: Create component**

```tsx
// components/chat/chat-widget.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { ChatPopup } from "./chat-popup";
import { ChatSessionForm } from "./chat-session-form";
import type { ChatSession } from "@/types/chat";

export function ChatWidget() {
  const user = useAuthStore((s) => s.user);
  const { isOpen, activeSession, unreadCount, setOpen, setActiveSession } = useChatStore();
  const [initialized, setInitialized] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Fetch active session on mount
  useEffect(() => {
    if (!user) return;
    fetch("/api/chat/sessions")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setActiveSession(json.data as ChatSession);
      })
      .finally(() => setInitialized(true));
  }, [user, setActiveSession]);

  // Animate open/close
  useEffect(() => {
    if (!popupRef.current) return;
    if (isOpen) {
      gsap.fromTo(
        popupRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: "power2.out" },
      );
    }
  }, [isOpen]);

  function handleClose() {
    if (!popupRef.current) { setOpen(false); return; }
    gsap.to(popupRef.current, {
      opacity: 0,
      y: 20,
      scale: 0.95,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => setOpen(false),
    });
  }

  // Not logged in → don't show
  if (!user) return null;

  const showForm = initialized && !activeSession;
  const showChat = initialized && !!activeSession;

  return (
    <>
      {/* Popup */}
      {isOpen && (
        <div
          ref={popupRef}
          className={cn(
            "fixed z-50 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl",
            "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]",
            "md:bottom-20 md:right-6",
            "w-[calc(100vw-2rem)] max-w-[420px]",
            showForm ? "h-auto" : "h-[600px] max-h-[80vh]",
          )}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 z-10 rounded-full p-1 hover:bg-muted"
            aria-label="Tutup chat"
          >
            <X size={14} />
          </button>

          {showForm && (
            <ChatSessionForm
              onCreated={(id) => {
                fetch(`/api/chat/sessions/${id}`)
                  .then((r) => r.json())
                  .then((json) => { if (json.success) setActiveSession(json.data); });
              }}
            />
          )}
          {showChat && <ChatPopup onMinimize={handleClose} />}
        </div>
      )}

      {/* Floating button */}
      <button
        type="button"
        onClick={() => (isOpen ? handleClose() : setOpen(true))}
        aria-label={isOpen ? "Tutup chat" : "Buka chat"}
        className={cn(
          "fixed z-50",
          "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]",
          "md:bottom-6 md:right-6",
          "flex items-center gap-2 px-4 py-3",
          "bg-primary text-primary-foreground",
          "shadow-lg hover:bg-primary/90",
          "transition-swiss",
          isOpen && "opacity-0 pointer-events-none",
        )}
      >
        <MessageCircle size={20} className="shrink-0" />
        <span className="hidden text-xs font-bold uppercase sm:inline">Chat CS</span>
        {unreadCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-primary">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/chat/chat-widget.tsx
git commit -m "feat(ui): add chat widget floating button with GSAP animation"
```

---

## Task 13: Replace WhatsApp Button & User Dashboard Chat Page

**Files:**
- Modify: `app/(public)/layout.tsx`
- Modify: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/dashboard/chat/page.tsx`
- Modify: `components/dashboard/dashboard-sidebar.tsx`

- [ ] **Step 1: Replace WhatsApp button in `app/(public)/layout.tsx`**

In `app/(public)/layout.tsx`, replace:
```tsx
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
```
with:
```tsx
import { ChatWidget } from "@/components/chat/chat-widget";
```

Replace:
```tsx
<WhatsAppButton />
```
with:
```tsx
<ChatWidget />
```

- [ ] **Step 2: Replace WhatsApp button in `app/(dashboard)/layout.tsx`**

Open `app/(dashboard)/layout.tsx`. Find and replace:
```tsx
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
```
with:
```tsx
import { ChatWidget } from "@/components/chat/chat-widget";
```

Replace `<WhatsAppButton />` with `<ChatWidget />`.

- [ ] **Step 3: Create `app/(dashboard)/dashboard/chat/page.tsx`**

```tsx
// app/(dashboard)/dashboard/chat/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ChatSession } from "@/types/chat";

export const metadata: Metadata = { title: "Chat CS" };

async function fetchUserSessions(userId: string): Promise<ChatSession[]> {
  const { createClient: c } = await import("@/lib/supabase/server");
  const supabase = await c();
  const { data } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as ChatSession[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function DashboardChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/chat");

  const sessions = await fetchUserSessions(user.id);

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold uppercase text-[#7a7a7a]">Akun</p>
      <h1 className="mt-2 text-2xl font-bold text-[#1d1d1f] sm:text-3xl">Riwayat Chat</h1>

      {sessions.length === 0 ? (
        <p className="mt-10 text-sm text-[#5c5c5c]">
          Belum ada riwayat chat. Klik tombol chat di pojok kanan bawah untuk mulai.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-xl border border-[#e8e4dc] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#1d1d1f]">{session.subject}</p>
                  <p className="mt-0.5 text-xs text-[#7a7a7a]">
                    {formatDate(session.updated_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    session.status === "open"
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {session.status === "open" ? "Aktif" : "Selesai"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add Chat to `components/dashboard/dashboard-sidebar.tsx`**

In the `NAV_PRIMARY` array, add after the Notifikasi item:
```tsx
{ label: "Chat CS", href: "/dashboard/chat", icon: MessageCircle },
```

Add `MessageCircle` to the lucide imports at the top.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/(public)/layout.tsx app/(dashboard)/layout.tsx app/(dashboard)/dashboard/chat/ components/dashboard/dashboard-sidebar.tsx
git commit -m "feat: integrate chat widget into layouts, add dashboard chat history page"
```

---

## Task 14: Admin Chat Inbox

**Files:**
- Create: `components/admin/admin-chat-session-list.tsx`
- Create: `components/admin/admin-quick-reply-picker.tsx`
- Create: `components/admin/admin-chat-detail.tsx`
- Create: `components/admin/admin-chat-inbox.tsx`
- Create: `app/admin/(panel)/chat/page.tsx`
- Modify: `components/layout/admin-sidebar.tsx`

- [ ] **Step 1: Create `components/admin/admin-chat-session-list.tsx`**

```tsx
// components/admin/admin-chat-session-list.tsx
"use client";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/types/chat";

type Props = {
  sessions: ChatSession[];
  selectedId: string | null;
  onSelect: (session: ChatSession) => void;
  filter: "all" | "open" | "resolved";
  onFilterChange: (f: "all" | "open" | "resolved") => void;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hr lalu`;
}

const FILTER_TABS = [
  { key: "all", label: "Semua" },
  { key: "open", label: "Aktif" },
  { key: "resolved", label: "Selesai" },
] as const;

export function AdminChatSessionList({ sessions, selectedId, onSelect, filter, onFilterChange }: Props) {
  const filtered = filter === "all" ? sessions : sessions.filter((s) => s.status === filter);

  return (
    <div className="flex h-full flex-col border-r border-border">
      {/* Filter tabs */}
      <div className="flex border-b border-border">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onFilterChange(tab.key)}
            className={cn(
              "flex-1 py-2 text-xs font-semibold transition-colors",
              filter === tab.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="p-4 text-xs text-muted-foreground">Tidak ada sesi.</p>
        )}
        {filtered.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelect(session)}
            className={cn(
              "flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left transition-colors",
              selectedId === session.id ? "bg-primary/5" : "hover:bg-muted/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="truncate text-sm font-medium">
                {session.profile?.full_name ?? "User"}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {timeAgo(session.updated_at)}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">{session.subject}</p>
            <span
              className={cn(
                "w-fit rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                session.status === "open"
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500",
              )}
            >
              {session.status === "open" ? "Aktif" : "Selesai"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/admin/admin-quick-reply-picker.tsx`**

```tsx
// components/admin/admin-quick-reply-picker.tsx
"use client";
import { useEffect, useRef } from "react";
import type { ChatQuickReply } from "@/types/chat";

type Props = {
  replies: ChatQuickReply[];
  onSelect: (content: string) => void;
  onClose: () => void;
};

export function AdminQuickReplyPicker({ replies, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  if (replies.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-20 mb-1 w-72 rounded-xl border border-border bg-background shadow-lg"
    >
      <p className="border-b border-border px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground">
        Quick Replies
      </p>
      <div className="max-h-48 overflow-y-auto">
        {replies.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => { onSelect(r.content); onClose(); }}
            className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted/40"
          >
            <span className="text-xs font-semibold text-primary">{r.shortcut}</span>
            <span className="truncate text-xs text-muted-foreground">{r.content}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `components/admin/admin-chat-detail.tsx`**

```tsx
// components/admin/admin-chat-detail.tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatMessageItem } from "@/components/chat/chat-message-item";
import { ChatTypingIndicator } from "@/components/chat/chat-typing-indicator";
import { AdminQuickReplyPicker } from "./admin-quick-reply-picker";
import { ChatAttachmentPreview } from "@/components/chat/chat-attachment-preview";
import { useChatRealtime } from "@/lib/chat/use-chat-realtime";
import { useChatPresence } from "@/lib/chat/use-chat-presence";
import { useAuthStore } from "@/store/auth-store";
import {
  ALLOWED_CHAT_FILE_TYPES,
  CHAT_SIZE_LIMITS,
  type ChatMessage,
  type ChatQuickReply,
  type ChatSession,
  type PendingAttachment,
} from "@/types/chat";
import { Paperclip, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  session: ChatSession;
  onSessionUpdate: (patch: Partial<ChatSession>) => void;
};

export function AdminChatDetail({ session, onSessionUpdate }: Props) {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState("");
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<ChatQuickReply[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Fetch messages
  useEffect(() => {
    fetch(`/api/chat/sessions/${session.id}/messages`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setMessages(json.data); });
    fetch(`/api/chat/sessions/${session.id}/read`, { method: "PATCH" });
  }, [session.id]);

  // Fetch quick replies once
  useEffect(() => {
    fetch("/api/admin/chat/quick-replies")
      .then((r) => r.json())
      .then((json) => { if (json.success) setQuickReplies(json.data); });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRemoteTyping]);

  const handleNewMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
    if (msg.sender_id !== user?.id) {
      fetch(`/api/chat/sessions/${session.id}/read`, { method: "PATCH" });
    }
  }, [user?.id, session.id]);

  const handleMsgUpdate = useCallback((patch: Partial<ChatMessage> & { id: string }) => {
    setMessages((prev) => prev.map((m) => m.id === patch.id ? { ...m, ...patch } : m));
  }, []);

  useChatRealtime({
    sessionId: session.id,
    onNewMessage: handleNewMessage,
    onSessionUpdate: onSessionUpdate,
    onMessageUpdate: handleMsgUpdate,
  });

  const { sendTyping } = useChatPresence({
    sessionId: session.id,
    myRole: "admin",
    onRemoteTyping: setIsRemoteTyping,
  });

  async function handleReact(messageId: string, emoji: string) {
    await fetch(`/api/chat/messages/${messageId}/react`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!ALLOWED_CHAT_FILE_TYPES.includes(file.type as never)) {
      toast.error("Tipe file tidak diizinkan");
      return;
    }
    const isImage = file.type.startsWith("image/");
    const limit = isImage ? CHAT_SIZE_LIMITS.image : CHAT_SIZE_LIMITS.document;
    if (file.size > limit) { toast.error(`Maks ${isImage ? "500 KB" : "1 MB"}`); return; }
    setPending({ file, preview_url: isImage ? URL.createObjectURL(file) : "" });
  }

  async function handleSend() {
    if ((!content.trim() && !pending) || sending) return;
    setSending(true);
    try {
      let attachmentData: { file_url: string; file_name: string; file_type: string; file_size: number } | undefined;
      if (pending) {
        const fd = new FormData();
        fd.append("file", pending.file);
        const res = await fetch("/api/chat/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!json.success) { toast.error(json.error ?? "Upload gagal"); return; }
        attachmentData = json.data;
        if (pending.preview_url) URL.revokeObjectURL(pending.preview_url);
        setPending(null);
      }

      const messageType = attachmentData
        ? attachmentData.file_type.startsWith("image/") ? "image" : "file"
        : "text";

      const res = await fetch(`/api/chat/sessions/${session.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() || null, message_type: messageType, attachment: attachmentData }),
      });
      const json = await res.json();
      if (!json.success) toast.error(json.error ?? "Gagal mengirim");
      else { setContent(""); textRef.current?.focus(); }
    } finally {
      setSending(false);
    }
  }

  async function handleCloseSession() {
    const res = await fetch(`/api/chat/sessions/${session.id}`, { method: "PATCH" });
    const json = await res.json();
    if (!json.success) toast.error(json.error ?? "Gagal menutup sesi");
  }

  const isResolved = session.status === "resolved";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{session.profile?.full_name ?? "User"}</p>
          <p className="truncate text-xs text-muted-foreground">{session.subject}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isResolved ? "secondary" : "default"} className="text-[10px]">
            {isResolved ? "Selesai" : "Aktif"}
          </Badge>
          {!isResolved && (
            <Button size="sm" variant="outline" onClick={handleCloseSession} className="text-xs h-7">
              Tutup Sesi
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            myUserId={user?.id ?? ""}
            onReact={handleReact}
          />
        ))}
        {isRemoteTyping && <div className="mb-2"><ChatTypingIndicator /></div>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isResolved ? (
        <div className="flex items-center gap-2 border-t border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <AlertCircle size={14} className="shrink-0" />
          Sesi ini telah ditutup.
        </div>
      ) : (
        <div className="relative border-t border-border bg-background p-3">
          {pending && (
            <div className="mb-2">
              <ChatAttachmentPreview
                attachment={pending}
                onRemove={() => { if (pending.preview_url) URL.revokeObjectURL(pending.preview_url); setPending(null); }}
              />
            </div>
          )}

          {showQuickReplies && (
            <AdminQuickReplyPicker
              replies={quickReplies}
              onSelect={(c) => setContent(c)}
              onClose={() => setShowQuickReplies(false)}
            />
          )}

          <div className="flex items-end gap-2">
            <input ref={fileRef} type="file" className="hidden" accept={ALLOWED_CHAT_FILE_TYPES.join(",")} onChange={handleFileChange} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={!!pending} className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Lampirkan file">
              <Paperclip size={18} />
            </button>

            <div className="relative flex-1">
              <textarea
                ref={textRef}
                value={content}
                onChange={(e) => {
                  const v = e.target.value;
                  setContent(v);
                  sendTyping();
                  if (v === "/") setShowQuickReplies(true);
                  else if (!v.startsWith("/")) setShowQuickReplies(false);
                }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ketik / untuk quick reply..."
                rows={1}
                disabled={sending}
                className={cn(
                  "w-full resize-none rounded-2xl border border-border bg-muted/40 px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary max-h-28 overflow-y-auto",
                )}
                onInput={(e) => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 112)}px`; }}
              />
            </div>

            <Button size="icon" onClick={handleSend} disabled={(!content.trim() && !pending) || sending} className="shrink-0 rounded-full" aria-label="Kirim">
              <Send size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `components/admin/admin-chat-inbox.tsx`**

```tsx
// components/admin/admin-chat-inbox.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { AdminChatSessionList } from "./admin-chat-session-list";
import { AdminChatDetail } from "./admin-chat-detail";
import { useAdminChatRealtime } from "@/lib/chat/use-chat-realtime";
import type { ChatSession } from "@/types/chat";

type Props = {
  initialSessions: ChatSession[];
};

export function AdminChatInbox({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [selected, setSelected] = useState<ChatSession | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/admin/chat/sessions");
    const json = await res.json();
    if (json.success) setSessions(json.data);
  }, []);

  useAdminChatRealtime(fetchSessions);

  function handleSessionUpdate(patch: Partial<ChatSession>) {
    setSessions((prev) => prev.map((s) => s.id === selected?.id ? { ...s, ...patch } : s));
    setSelected((prev) => prev ? { ...prev, ...patch } : prev);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border">
      {/* Left: session list */}
      <div className="w-72 shrink-0">
        <AdminChatSessionList
          sessions={sessions}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>

      {/* Right: detail */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <AdminChatDetail
            key={selected.id}
            session={selected}
            onSessionUpdate={handleSessionUpdate}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Pilih sesi untuk mulai chat
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `app/admin/(panel)/chat/page.tsx`**

```tsx
// app/admin/(panel)/chat/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AdminChatInbox } from "@/components/admin/admin-chat-inbox";
import type { ChatSession } from "@/types/chat";

export const metadata: Metadata = { title: "Chat Inbox" };

async function fetchAllSessions(): Promise<ChatSession[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("chat_sessions")
    .select("*, profile:profiles!chat_sessions_user_id_fkey(full_name, avatar_url)")
    .order("updated_at", { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as ChatSession[];
}

export default async function AdminChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/admin/login");

  const sessions = await fetchAllSessions();

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">Admin</p>
      <h1 className="mb-6 mt-2 text-2xl font-bold sm:text-3xl">Chat Inbox</h1>
      <AdminChatInbox initialSessions={sessions} />
    </div>
  );
}
```

- [ ] **Step 6: Add Chat to admin sidebar in `components/layout/admin-sidebar.tsx`**

In the `NAV_GROUPS` array, add to the "Konten" group:
```tsx
{ label: "Chat", href: "/admin/chat", icon: MessageCircle },
```

Add `MessageCircle` to the lucide imports.

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

Fix any errors, then:

- [ ] **Step 8: Commit**

```bash
git add components/admin/ app/admin/\(panel\)/chat/ components/layout/admin-sidebar.tsx
git commit -m "feat(admin): add chat inbox with realtime, quick replies, and session management"
```

---

## Task 15: Final Integration Check

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Manual test checklist**

1. Open site as logged-in user → chat button appears (not WhatsApp button)
2. Click chat → form appears → enter subject → session created
3. Send a text message → appears in real-time
4. Open admin at `/admin/chat` → session appears in inbox
5. Admin replies → user sees reply in real-time
6. Type in chat → typing indicator appears on other side
7. React to message → emoji shown on bubble
8. Upload image (< 500 KB) → appears in chat
9. Upload PDF (< 1 MB) → appears as file card
10. Upload file exceeding limit → error toast shown
11. Admin clicks "Tutup Sesi" → session resolves, user sees resolved state
12. User opens `/dashboard/chat` → session history shown
13. User can open new session after previous is resolved

- [ ] **Step 3: Fix any issues found during testing**

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete chat system implementation"
```

---

## Summary

| Task | Files | Status |
|------|-------|--------|
| 1 | DB migration | ☐ |
| 2 | TypeScript types | ☐ |
| 3 | Zustand store | ☐ |
| 4 | User API routes | ☐ |
| 5 | File upload API | ☐ |
| 6 | Admin API routes | ☐ |
| 7 | Realtime hooks | ☐ |
| 8 | Base UI components | ☐ |
| 9 | ChatMessageItem | ☐ |
| 10 | ChatInput | ☐ |
| 11 | ChatPopup | ☐ |
| 12 | ChatWidget | ☐ |
| 13 | Layout integration + dashboard page | ☐ |
| 14 | Admin inbox | ☐ |
| 15 | Final integration check | ☐ |
