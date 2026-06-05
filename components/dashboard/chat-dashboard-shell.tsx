"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  MessageCircle,
  Search,
  ChevronLeft,
  Clock,
  RefreshCw,
  AlertCircle,
  Headphones,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessageItem } from "@/components/chat/chat-message-item";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatTypingIndicator } from "@/components/chat/chat-typing-indicator";
import { useChatRealtime } from "@/lib/chat/use-chat-realtime";
import { useChatPresence } from "@/lib/chat/use-chat-presence";
import { cn } from "@/lib/utils";
import type { ChatSession, ChatMessage, PendingAttachment } from "@/types/chat";

type Props = { userId: string; initialSessions: ChatSession[] };

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  if (h < 48) return "Kemarin";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

const STATUS = {
  open: { label: "Aktif", cls: "bg-[#EA5329]/10 text-[#EA5329] border-0" },
  resolved: { label: "Selesai", cls: "bg-[#f5f5f7] text-[#6e6e73] border-0" },
} as const;

export function DashboardChatShell({ userId, initialSessions }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSessions[0]?.id ?? null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState<"list" | "chat">("list");
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;
  const filtered = sessions.filter((s) =>
    s.subject.toLowerCase().includes(search.toLowerCase()),
  );

  // Fetch messages + mark read when selected session changes
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    setLoading(true);
    setMessages([]);
    fetch(`/api/chat/sessions/${selectedId}/messages`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setMessages(json.data as ChatMessage[]); })
      .catch(() => toast.error("Gagal memuat pesan"))
      .finally(() => setLoading(false));
    fetch(`/api/chat/sessions/${selectedId}/read`, { method: "PATCH" });
  }, [selectedId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isRemoteTyping]);

  // Stable callbacks for realtime hooks
  const onNewMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const onSessionUpdate = useCallback(
    (patch: Partial<ChatSession>) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === selectedId ? { ...s, ...patch } : s)),
      );
    },
    [selectedId],
  );

  const onMessageUpdate = useCallback(
    (patch: Partial<ChatMessage> & { id: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === patch.id ? { ...m, ...patch } : m)),
      );
    },
    [],
  );

  useChatRealtime({ sessionId: selectedId, onNewMessage, onSessionUpdate, onMessageUpdate });
  const { sendTyping } = useChatPresence({
    sessionId: selectedId,
    myRole: "user",
    onRemoteTyping: setIsRemoteTyping,
  });

  function selectSession(id: string) {
    if (id !== selectedId) setSelectedId(id);
    setPanel("chat");
  }

  async function handleSend(content: string, attachment?: PendingAttachment) {
    if (!selectedSession) return;
    let attachmentData:
      | { file_url: string; file_name: string; file_type: string; file_size: number }
      | undefined;
    if (attachment) {
      const fd = new FormData();
      fd.append("file", attachment.file);
      const res = await fetch("/api/chat/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) { toast.error(json.error ?? "Upload gagal"); throw new Error(json.error); }
      attachmentData = json.data;
    }
    const messageType = attachmentData?.file_type.startsWith("image/")
      ? "image"
      : attachmentData
        ? "file"
        : "text";
    const res = await fetch(`/api/chat/sessions/${selectedSession.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content || null,
        message_type: messageType,
        attachment: attachmentData,
      }),
    });
    const json = await res.json();
    if (!json.success) { toast.error(json.error ?? "Gagal mengirim"); throw new Error(json.error); }
    setSessions((prev) =>
      prev.map((s) =>
        s.id === selectedId ? { ...s, updated_at: new Date().toISOString() } : s,
      ),
    );
  }

  async function handleReact(messageId: string, emoji: string) {
    await fetch(`/api/chat/messages/${messageId}/react`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
  }

  const isResolved = selectedSession?.status === "resolved";

  return (
    <div className="flex h-[calc(100svh-7rem)] overflow-hidden rounded-2xl border border-[#e8e4dc]">

      {/* ── Left: sessions list ──────────────────────────────── */}
      <div
        className={cn(
          "flex w-full shrink-0 flex-col border-r border-[#e8e4dc] bg-white md:w-[280px] lg:w-[300px]",
          panel === "chat" ? "hidden md:flex" : "flex",
        )}
      >
        {/* header */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-[#f0ede7] px-4 py-3">
          <Headphones className="h-4 w-4 shrink-0 text-[#EA5329]" />
          <span className="flex-1 text-[13px] font-semibold text-[#1d1d1f]">
            Riwayat Chat CS
          </span>
        </div>

        {/* search */}
        {sessions.length > 3 && (
          <div className="shrink-0 border-b border-[#f0ede7] px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#b0b0b0]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari percakapan..."
                className="h-8 border-0 bg-[#f5f4f0] pl-8 text-[13px] focus-visible:ring-0"
              />
            </div>
          </div>
        )}

        {/* list */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#f8f6f2]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <MessageCircle className="h-8 w-8 text-[#d0d0d0]" />
              <p className="text-[13px] text-[#b0b0b0]">
                {sessions.length === 0 ? "Belum ada percakapan" : "Tidak ditemukan"}
              </p>
              {sessions.length === 0 && (
                <p className="text-[12px] leading-relaxed text-[#c0c0c0]">
                  Klik tombol chat di pojok kanan bawah untuk memulai
                </p>
              )}
            </div>
          ) : (
            filtered.map((s) => {
              const isActive = selectedId === s.id;
              const cfg = STATUS[s.status];
              return (
                <button
                  key={s.id}
                  onClick={() => selectSession(s.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                    isActive ? "bg-[#fdf4f1]" : "hover:bg-[#faf8f4]",
                  )}
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-bold text-white">
                    CS
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-[12.5px] font-semibold text-[#1d1d1f]">
                        {s.subject}
                      </p>
                      <span className="shrink-0 text-[10.5px] text-[#b0b0b0]">
                        {relativeTime(s.updated_at)}
                      </span>
                    </div>
                    <Badge className={cn("mt-1.5 px-1.5 py-0 text-[10px] font-medium", cfg.cls)}>
                      {cfg.label}
                    </Badge>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* new chat CTA */}
        <div className="shrink-0 border-t border-[#f0ede7] p-3">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => {
              document
                .querySelector<HTMLButtonElement>('[aria-label="Buka chat CS"]')
                ?.click();
            }}
          >
            + Mulai Chat Baru
          </Button>
        </div>
      </div>

      {/* ── Right: chat panel ────────────────────────────────── */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col bg-[#fafafa]",
          panel === "list" ? "hidden md:flex" : "flex",
        )}
      >
        {selectedSession ? (
          <>
            {/* chat header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-[#e8e4dc] bg-white px-4 py-3">
              <button
                className="rounded-full p-1 text-[#7a7a7a] transition-colors hover:bg-[#f1f0ee] md:hidden"
                onClick={() => setPanel("list")}
                aria-label="Kembali"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-bold text-white">
                CS
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#1d1d1f]">
                  {selectedSession.subject}
                </p>
                <p className="text-[11px] text-[#7a7a7a]">GeekyTech Support</p>
              </div>
              <Badge className={cn("shrink-0 text-[11px]", STATUS[selectedSession.status].cls)}>
                {STATUS[selectedSession.status].label}
              </Badge>
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-[#b0b0b0]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <Clock className="h-7 w-7 text-[#d0d0d0]" />
                  <p className="text-[13px] text-[#b0b0b0]">Belum ada pesan</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <ChatMessageItem
                      key={msg.id}
                      message={msg}
                      myUserId={userId}
                      onReact={handleReact}
                    />
                  ))}
                  {isRemoteTyping && (
                    <div className="mb-2">
                      <ChatTypingIndicator />
                    </div>
                  )}
                </>
              )}
              <div ref={bottomRef} />
            </div>

            {/* input / resolved notice */}
            {isResolved ? (
              <div className="flex shrink-0 items-center gap-2 border-t border-[#e8e4dc] bg-[#f5f5f7] p-4 text-[12px] text-[#7a7a7a]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Sesi ini telah selesai. Buka chat baru untuk menghubungi CS kembali.
              </div>
            ) : (
              <ChatInput onSend={handleSend} onTyping={sendTyping} disabled={false} />
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f4f0]">
              <MessageCircle className="h-7 w-7 text-[#c0c0c0]" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#1d1d1f]">Pilih percakapan</p>
              <p className="mt-1 text-[13px] text-[#7a7a7a]">
                atau mulai chat baru dengan CS
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
