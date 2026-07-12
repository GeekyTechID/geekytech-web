"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChatMessageItem } from "@/components/chat/chat-message-item";
import { ChatTypingIndicator } from "@/components/chat/chat-typing-indicator";
import { ChatAttachmentPreview } from "@/components/chat/chat-attachment-preview";
import { AdminChatStatusBadge } from "./admin-chat-status-badge";
import { AdminQuickReplyPicker } from "./admin-quick-reply-picker";
import { useChatRealtime } from "@/lib/chat/use-chat-realtime";
import { useChatPresence } from "@/lib/chat/use-chat-presence";
import { useAuthStore } from "@/store/auth-store";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ALLOWED_CHAT_FILE_TYPES,
  CHAT_SIZE_LIMITS,
  type ChatMessage,
  type ChatQuickReply,
  type ChatSession,
  type PendingAttachment,
} from "@/types/chat";

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

  useEffect(() => {
    fetch(`/api/chat/sessions/${session.id}/messages`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setMessages(json.data); });
    fetch(`/api/chat/sessions/${session.id}/read`, { method: "PATCH" });
  }, [session.id]);

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
    onSessionUpdate,
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
      const messageType = attachmentData?.file_type.startsWith("image/") ? "image" : attachmentData ? "file" : "text";
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
      if (textRef.current) textRef.current.style.height = "auto";
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
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="sm">
            <AvatarImage src={session.profile?.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-[10px] font-semibold">
              {getInitials(session.profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold">{session.profile?.full_name ?? "User"}</p>
            <p className="truncate text-xs text-muted-foreground">{session.subject}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AdminChatStatusBadge status={session.status} />
          {!isResolved && (
            <Button size="sm" variant="outline" onClick={handleCloseSession} className="h-7 text-xs">
              Tutup Sesi
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-3 py-2">
          {messages.map((msg) => (
            <ChatMessageItem key={msg.id} message={msg} myUserId={user?.id ?? ""} onReact={handleReact} />
          ))}
          {isRemoteTyping && <div className="mb-2"><ChatTypingIndicator /></div>}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {isResolved ? (
        <div className="flex shrink-0 items-center gap-2 border-t border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <AlertCircle size={14} className="shrink-0" />
          Sesi ini telah ditutup.
        </div>
      ) : (
        <div className="relative shrink-0 border-t border-border bg-background p-3">
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={!!pending} className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted disabled:opacity-50" aria-label="Lampirkan file">
                  <Paperclip size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Lampirkan file</TooltipContent>
            </Tooltip>
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
                placeholder="Ketik / untuk quick reply, Enter untuk kirim..."
                rows={1}
                disabled={sending}
                className={cn(
                  "w-full resize-none rounded-2xl border border-border bg-muted/40 px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary max-h-28 overflow-y-auto",
                )}
                onInput={(e) => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 112)}px`; }}
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" onClick={handleSend} disabled={(!content.trim() && !pending) || sending} className="shrink-0 rounded-full" aria-label="Kirim">
                  <Send size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Kirim (Enter)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}
