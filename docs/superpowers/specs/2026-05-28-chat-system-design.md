# Chat System Design — GeekyTech
**Date:** 2026-05-28  
**Status:** Approved  
**Replaces:** WhatsApp floating button

---

## Overview

Real-time in-app chat antara user dan admin. 1 active session per user (ticket-based). Admin lihat semua session di 1 inbox. History tersimpan di user dashboard dan admin panel.

---

## Architecture

**Approach:** Pure Supabase Realtime  
**Reasoning:** Zero infra baru, consistent dengan stack existing, RLS sudah terpola, cukup scalable untuk volume saat ini (~3.565 customers).

Stack:
- Supabase Realtime → live messages + session updates
- Supabase Realtime Presence → typing indicators (ephemeral, no table)
- Supabase Storage bucket `chat-attachments` → file uploads
- Zustand `chatStore` → client state (activeSession, messages, unreadCount, isOpen)
- GSAP → animasi widget slide-up / typing bounce
- shadcn/ui → semua UI components

---

## Database Schema

### `chat_sessions`
```sql
id          uuid PK
user_id     uuid FK profiles
status      text  -- 'open' | 'resolved'
subject     text  -- topik yang diinput user saat buka sesi
created_at  timestamptz
updated_at  timestamptz
closed_at   timestamptz nullable
```
Constraint: 1 user max 1 row dengan `status='open'` bersamaan (enforced via API + DB check).

### `chat_messages`
```sql
id           uuid PK
session_id   uuid FK chat_sessions
sender_id    uuid FK profiles
sender_role  text  -- 'user' | 'admin' | 'system'
content      text nullable
message_type text  -- 'text' | 'image' | 'file' | 'system'
reactions    jsonb  -- { "👍": ["user_id_1", ...], ... }
is_read      boolean DEFAULT false
created_at   timestamptz
```

### `chat_attachments`
```sql
id         uuid PK
message_id uuid FK chat_messages
file_url   text
file_name  text
file_type  text  -- MIME type
file_size  integer  -- bytes
```

### `chat_quick_replies`
```sql
id        uuid PK
shortcut  text  -- e.g. "/hello"
content   text
created_at timestamptz
```

### Typing indicator
No table. Gunakan Supabase Realtime Presence pada channel `chat:<sessionId>`.

---

## File Size Limits

| Type | Max Size |
|------|----------|
| Image (`image/*`) | 500 KB |
| PDF (`application/pdf`) | 1 MB |
| Word (`.doc`, `.docx`) | 1 MB |

Validasi di client (pre-upload feedback) + di `/api/chat/upload` (server enforcement).

---

## UI Components

### User Side

**`ChatWidget`** (floating, posisi identik dengan WA button yang digantikan)
- Minimized: tombol bulat `MessageCircle` icon, unread badge count
- Expanded: popup `420×600px` (mobile: full-width bottom sheet), animasi GSAP slide-up
- Jika tidak ada session open → tampilkan `ChatSessionForm` (input subject)
- Jika ada session open → langsung `ChatPopup`
- Hanya muncul jika user sudah login; guest tidak lihat widget

**`ChatPopup`**
- Header: subject sesi, status badge, tombol minimize + "Tutup Sesi"
- Message list: bubble kanan (user), kiri (admin), timestamp, read receipt ✓✓
- Typing indicator: "Admin sedang mengetik..." dengan 3-dot GSAP bounce animation
- Klik pesan → emoji reaction picker mini (6 emoji: 👍 ❤️ 😂 😮 😢 🙏)
- Input area: auto-grow textarea, attach file button, send button
- File preview card sebelum kirim (nama + ukuran + tombol hapus)
- System messages (open/close sesi) ditampilkan center sebagai divider label

**`/dashboard/chat`** — riwayat semua session user
- List session cards: subject, last message preview, status badge (open/resolved), tanggal
- Klik → detail full history (read-only jika resolved, active jika open)

### Admin Side

**`/admin/chat`** — inbox split panel
- Left: list semua session, sorted by `updated_at DESC`, filter tabs (Semua / Open / Resolved)
- Setiap item: nama user, subject, last message preview, unread count badge, timestamp
- Right: detail chat + info user sidebar (nama, email, total order count)
- Tombol "Tutup Sesi" → set `status='resolved'`, insert system message, notif ke user
- Quick replies: ketik `/` di input → dropdown canned responses dari `chat_quick_replies`
- Admin bisa manage quick replies di halaman tersendiri `/admin/chat/quick-replies`

---

## Data Flow

### New Session
1. User klik widget → cek `chatStore.activeSession`
2. Jika null → tampilkan `ChatSessionForm` (input subject)
3. Submit → `POST /api/chat/sessions` → cek tidak ada session open → insert `chat_sessions` → insert system message "Sesi dimulai"
4. Return session → store di `chatStore` → buka `ChatPopup`

### Send Message
1. User/admin submit input → `POST /api/chat/sessions/[id]/messages`
2. Validasi Zod (content + attachments)
3. Insert `chat_messages`
4. Jika ada file → sudah di-upload sebelumnya ke `chat_attachments`
5. `createNotification()` ke pihak lawan (extend existing system)
6. Supabase Realtime broadcast message ke subscriber → update UI real-time

### File Upload
1. Client select file → validasi tipe + ukuran di client
2. `POST /api/chat/upload` → validasi ulang di server → upload ke Supabase Storage `chat-attachments`
3. Return `{ file_url, file_name, file_type, file_size }`
4. Simpan sebagai pending attachment, kirim bersamaan dengan pesan

### Typing Indicator
1. User ketik → `presence.track({ typing: true, sender_role: 'user' })`
2. Debounce 300ms stop typing → `presence.track({ typing: false })` atau auto-expire 3 detik
3. Listener pihak lawan tampilkan/sembunyikan typing indicator

### Read Receipts
1. Saat popup/panel dibuka atau message baru masuk → `PATCH /api/chat/sessions/[id]/read`
2. Batch update `is_read=true` semua pesan dari sender lawan di session ini
3. Realtime subscription update ✓✓ di message bubbles pengirim

### Close Session
1. Admin klik "Tutup Sesi" → `PATCH /api/chat/sessions/[id]` `{ status: 'resolved' }`
2. Insert system message "Sesi chat telah ditutup oleh admin"
3. `createNotification()` ke user: "Sesi chat kamu telah ditutup"
4. Widget user auto-update via Realtime `chat_sessions` subscription → tampilkan state resolved + tombol "Buka Sesi Baru"

---

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/chat/sessions` | List user sessions / create new |
| GET/PATCH | `/api/chat/sessions/[id]` | Get session / close session |
| GET/POST | `/api/chat/sessions/[id]/messages` | History / send message |
| PATCH | `/api/chat/sessions/[id]/read` | Mark messages as read |
| POST | `/api/chat/upload` | File upload |
| GET | `/api/admin/chat/sessions` | All sessions (admin) |
| GET/POST/DELETE | `/api/admin/chat/quick-replies` | Manage canned responses |

All routes: Zod validation, consistent `{ success, data/error }` response format.

---

## Realtime Subscriptions

### User widget
```ts
// Messages in active session
supabase.channel('chat-messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages',
      filter: `session_id=eq.${sessionId}` }, handler)

// Session status changes
supabase.channel('chat-session')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_sessions',
      filter: `id=eq.${sessionId}` }, handler)

// Typing presence
supabase.channel(`chat:${sessionId}`).on('presence', { event: 'sync' }, handler)
```

### Admin inbox
```ts
// All new sessions
supabase.channel('admin-chat-sessions')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions' }, handler)

// Messages in selected session
supabase.channel('admin-chat-messages')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages',
      filter: `session_id=eq.${selectedSessionId}` }, handler)
```

---

## RLS Policies

- `chat_sessions`: user SELECT/UPDATE own rows; admin ALL
- `chat_messages`: user SELECT/INSERT own session messages; admin ALL
- `chat_attachments`: inherit via message → session → user_id
- `chat_quick_replies`: admin ALL; no user access
- Storage bucket `chat-attachments`: authenticated users can upload; public read via signed URL

---

## Notifications Integration

Extend existing `createNotification()` / `createAdminNotification()`:
- Trigger: setiap INSERT ke `chat_messages`
- User notification type: `'chat_message'`
- Admin notification type: `'chat_message_user'`
- Notification bell existing auto-refresh via Realtime (sudah ada)

---

## Zustand Store (`chatStore`)

```ts
{
  isOpen: boolean
  activeSession: ChatSession | null
  messages: ChatMessage[]
  unreadCount: number
  isTyping: boolean  // remote party typing

  // actions
  setOpen, setSession, addMessage, setMessages,
  setUnreadCount, setTyping, resetChat
}
```

---

## File Structure

```
app/
  (public)/layout.tsx                    ← ganti WhatsAppButton → ChatWidget
  (dashboard)/dashboard/chat/page.tsx   ← riwayat session user
  admin/(panel)/chat/page.tsx           ← inbox admin
  admin/(panel)/chat/quick-replies/page.tsx

api/
  chat/sessions/route.ts
  chat/sessions/[id]/route.ts
  chat/sessions/[id]/messages/route.ts
  chat/sessions/[id]/read/route.ts
  chat/upload/route.ts
  admin/chat/sessions/route.ts
  admin/chat/quick-replies/route.ts

components/chat/
  chat-widget.tsx
  chat-popup.tsx
  chat-message-item.tsx
  chat-input.tsx
  chat-attachment-preview.tsx
  chat-typing-indicator.tsx
  chat-session-form.tsx
  emoji-reaction-picker.tsx

components/admin/
  admin-chat-inbox.tsx
  admin-chat-session-list.tsx
  admin-chat-detail.tsx
  admin-quick-reply-picker.tsx

store/chatStore.ts
lib/chat/use-chat-realtime.ts
lib/chat/use-chat-presence.ts

supabase/migrations/018_chat_system.sql
```

---

## Security

- All API routes require authenticated session
- Admin routes verify `role='admin'` via service client
- File upload: server-side MIME + size validation (tidak hanya rely pada client)
- File URLs: served via Supabase Storage signed URLs (expire 1 jam) untuk akses private
- RLS aktif di semua tabel chat
- Zod validation di semua API inputs

---

## Out of Scope

- Multi-admin assignment
- Chat bot / auto-reply
- Voice/video chat
- Export chat history
- Search dalam chat
