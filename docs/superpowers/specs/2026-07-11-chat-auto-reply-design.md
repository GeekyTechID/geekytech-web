# Chat Auto-Reply Design — GeekyTech
**Date:** 2026-07-11
**Status:** Approved
**Extends:** [2026-05-28-chat-system-design.md](./2026-05-28-chat-system-design.md) (which listed "chat bot / auto-reply" as Out of Scope — this spec brings the simple instant-greeting version in scope)

---

## Overview

Saat user membuka sesi chat baru, sistem otomatis mengirim satu pesan sambutan yang tampil sebagai bubble balasan "Admin" — memberi kesan direspon instan sambil admin beneran belum sempat baca. Bukan bot FAQ/keyword, bukan berbasis jam operasional — murni greeting sekali per sesi baru.

**Goals:**
- User merasa dihargai begitu chat dibuka, tanpa nunggu admin online.
- Admin bisa ubah teks kapan aja dari panel, tanpa deploy.
- Admin bisa matiin fitur ini kapan aja (toggle).

**Non-goals (out of scope untuk iterasi ini):**
- Jam operasional / deteksi admin online-offline.
- Auto-answer berbasis keyword/FAQ.
- Follow-up message kalau admin gak respon dalam waktu tertentu.
- Multi-template per kategori/subject.

---

## Approaches Considered

1. **Extend existing API route `POST /api/chat/sessions`** (dipilih) — insert pesan auto-reply tepat setelah system message "Sesi dimulai" di-insert, di route yang sama. Konsisten dengan pola yang sudah ada (system message pakai trik sender_id serupa), minim perubahan, mudah di-trace.
2. **DB trigger di `chat_sessions`** (seperti `handle_new_user` untuk welcome notification) — lebih "atomic" karena jalan di level DB, tapi butuh baca tabel `settings` dari dalam trigger SQL (lebih ribet ditest/debug) dan gak konsisten dengan pola system message yang sekarang di API route, bukan trigger.
3. **Cron/edge function terpisah** — over-engineered untuk kebutuhan sesederhana ini, ditolak.

**Dipilih: Approach 1.**

---

## Database

**Tidak ada tabel baru.** Reuse tabel `settings` (key-value, sudah dipakai untuk `store_origin`, `whatsapp_cs`, dll — lihat [lib/settings/queries.ts](../../../lib/settings/queries.ts)).

Key baru:
| Key | Value | Default |
|---|---|---|
| `chat_auto_reply_enabled` | `boolean` | `true` |
| `chat_auto_reply_template` | `string` (berisi placeholder `{{name}}`, `{{subject}}`) | lihat Copywriting di bawah |

---

## Sender Identity

Bubble auto-reply harus tampil sebagai pesan "Admin" (kiri, `bg-muted`), bukan pesan sendiri (kanan, `bg-primary`) di layar user. Rendering bubble ditentukan oleh:

```ts
const isMine = message.sender_id === myUserId; // chat-message-item.tsx:50
```

Karena itu, **sender_id tidak boleh sama dengan `user.id` si customer** (beda dengan trik system message yang reuse `user.id` + `sender_role='system'`, yang aman karena system message di-render terpisah lewat cabang `sender_role === 'system'` sebelum sampai ke `isMine`).

**Keputusan:** ambil satu profil admin asli yang sudah ada, dinamis saat insert:
```sql
SELECT id FROM profiles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
```
Tidak membuat akun/profile bot baru (butuh row `auth.users` juga karena `profiles.id` FK ke situ — overhead gak perlu untuk kebutuhan ini). Kalau tidak ada admin sama sekali di DB, auto-reply di-skip diam-diam (tidak block pembuatan sesi).

Risiko yang diterima: kalau admin yang idnya kepakai dihapus, `ON DELETE CASCADE` dari `auth.users` → `profiles` → `chat_messages.sender_id` bakal cascade-delete pesan itu. Ini risiko yang sudah ada di desain existing untuk semua pesan admin manapun, bukan risiko baru dari fitur ini.

---

## Data Flow

Extend `POST /api/chat/sessions` ([route.ts](../../../app/api/chat/sessions/route.ts)), setelah insert system message "Sesi dimulai":

1. Fetch `chat_auto_reply_enabled` + `chat_auto_reply_template` via service client.
2. Kalau `enabled === false` atau template kosong/whitespace → skip, lanjut ke notifikasi admin seperti biasa.
3. Query 1 admin profile (lihat di atas). Kalau tidak ada → skip.
4. Render template: replace `{{name}}` dengan `profile.full_name` (fallback `"Kak"` kalau null/kosong), `{{subject}}` dengan subject sesi yang baru dibuat.
5. Insert ke `chat_messages`:
   ```ts
   { session_id, sender_id: adminId, sender_role: 'admin', content: rendered, message_type: 'text' }
   ```
6. Seluruh langkah 1-5 dibungkus try/catch terpisah dari flow utama — kegagalan di sini (misal settings gak kebaca) tidak boleh menggagalkan pembuatan sesi chat itu sendiri. Log error, lanjut.
7. Realtime broadcast otomatis jalan seperti pesan biasa (subscription existing di `chat_messages` INSERT sudah cover ini, tidak perlu perubahan di sisi client/realtime).

---

## Copywriting

Sengaja **tidak menjanjikan waktu respon spesifik** (mis. "dalam 15 menit") karena belum ada sistem jam operasional untuk menjamin itu — janji yang gak selalu ditepati merusak trust lebih dari gak janji sama sekali.

**Template default (direkomendasikan):**
```
Halo {{name}}, makasih udah hubungi GeekyTech soal {{subject}}. Pesanmu udah kami terima dan bakal dibalas tim kami secepatnya. Ditunggu ya!
```

**Alternatif (lebih hangat, tersedia sebagai referensi di form, admin bebas pilih/edit):**
```
Hai {{name}}! Terima kasih udah menghubungi kami soal {{subject}}. Tim GeekyTech bakal segera balas — kalau ada detail tambahan, langsung aja kirim di sini.
```

Placeholder yang didukung: `{{name}}`, `{{subject}}`. Fallback `{{name}}` → `"Kak"` kalau `full_name` user kosong.

---

## Admin UI — halaman baru `/admin/chat/quick-replies`

Halaman ini belum pernah ada (gap lama — quick-reply cuma punya API `/api/admin/chat/quick-replies`, belum ada UI CRUD-nya sama sekali). Auto-reply setting digabung di sini karena satu tema: "pesan kalengan" chat.

**Layout (top to bottom):**
1. **Card Auto-Reply**
   - Switch on/off (label: "Aktifkan Auto-Reply")
   - Textarea template (dengan hint kecil di bawah: "Gunakan `{{name}}` dan `{{subject}}`")
   - Preview live: render template dengan contoh dummy ("Budi", "Tanya stok iPhone 15") saat mengetik
   - Tombol Simpan (server action, pola sama seperti `saveSetting` di `app/admin/(panel)/settings/_actions.ts`)
2. **Section Quick Replies**
   - Table existing quick-replies (shortcut + content + tombol hapus)
   - Form tambah baru (shortcut + content, submit → POST existing API)
   - Reuse tampilan mirip [admin-quick-reply-picker.tsx](../../../components/admin/admin-quick-reply-picker.tsx) tapi versi manage, bukan versi picker popup.

**Entry point:** tombol kecil "Kelola Quick Reply" di header `/admin/chat` (Chat Inbox), di samping judul "Chat Inbox". Tidak menambah entry baru di sidebar admin (`admin-sidebar.tsx`) — cukup link kontekstual dari halaman terkait, mengikuti pola sub-halaman `Settings` yang juga tidak semua muncul di sidebar utama.

---

## File Structure (baru & disentuh)

```
app/admin/(panel)/chat/
  page.tsx                                    ← tambah tombol link ke quick-replies
  quick-replies/
    page.tsx                                  ← baru, server component, fetch settings + quick replies
    _actions.ts                                ← baru, saveSetting-style server actions
    _components/
      auto-reply-form.tsx                      ← baru, client component (switch + textarea + preview)
      quick-reply-manager.tsx                  ← baru, client component (table + add form + delete)

app/api/chat/sessions/route.ts                ← tambah step auto-reply setelah system message
lib/settings/queries.ts                        ← tambah getChatAutoReplySettings()
lib/chat/render-auto-reply-template.ts         ← baru, helper replace {{name}}/{{subject}}
```

Tidak ada migration baru. Tidak ada perubahan tipe di `types/chat.ts` (auto-reply message adalah `ChatMessage` biasa dengan `sender_role: 'admin'`).

---

## Error Handling & Edge Cases

- Admin tidak ditemukan di DB → skip auto-reply, tidak error ke user.
- Toggle mati atau template kosong/whitespace-only → skip.
- Gagal fetch settings (network/DB error) → catch, log, skip — pembuatan sesi tetap sukses.
- `full_name` null/kosong → fallback `"Kak"`.
- Race condition pembuatan sesi ganda → sudah tercover oleh unique constraint existing; auto-reply hanya jalan di path yang berhasil insert session.

---

## Testing Plan

- Unit test `render-auto-reply-template.ts`: replace placeholder normal, placeholder hilang di template, name kosong → fallback.
- Integration test `POST /api/chat/sessions`: toggle on → 2 pesan baru masuk (system + admin auto-reply) dengan urutan benar; toggle off → cuma 1 pesan system; tidak ada admin di DB → tidak error, sesi tetap kebuat.
- Manual QA di browser: buka sesi baru sebagai user → cek bubble auto-reply muncul di kiri (bukan kanan), isi sesuai template + placeholder ter-render benar. Ubah template dari `/admin/chat/quick-replies` → cek preview live dan hasil pesan berikutnya ikut berubah. Matikan toggle → sesi baru berikutnya tidak dapat auto-reply.

---

## Out of Scope

- Jam operasional / status online-offline admin.
- Auto-answer keyword/FAQ bot.
- Follow-up reminder kalau admin belum respon.
- Multi-template per kategori.
- Akun/profile bot khusus untuk sender auto-reply.
