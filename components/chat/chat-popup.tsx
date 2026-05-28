"use client";
import { useCallback, useEffect, useRef } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    isOpen,
    activeSession,
    messages,
    isRemoteTyping,
    setActiveSession,
    setMessages,
    addMessage,
    updateMessage,
    setRemoteTyping,
    incrementUnread,
    setUnreadCount,
  } = useChatStore();

  const bottomRef = useRef<HTMLDivElement>(null);
  const myRole = profile?.role === "admin" ? "admin" : "user";
  const sessionId = activeSession?.id ?? null;

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/chat/sessions/${sessionId}/messages`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setMessages(json.data); });
    fetch(`/api/chat/sessions/${sessionId}/read`, { method: "PATCH" });
    setUnreadCount(0); // Reset badge when popup opens
  }, [sessionId, setMessages, setUnreadCount]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRemoteTyping]);

  const handleNewMessage = useCallback(
    (msg: ChatMessage) => {
      addMessage(msg);
      if (msg.sender_id !== user?.id) {
        if (isOpen) {
          // Popup is visible — mark read immediately
          fetch(`/api/chat/sessions/${sessionId}/read`, { method: "PATCH" });
        } else {
          // Popup is closed — increment badge
          incrementUnread();
        }
      }
    },
    [addMessage, user?.id, sessionId, isOpen, incrementUnread],
  );

  const handleSessionUpdate = useCallback(
    (patch: Partial<ChatSession>) => {
      useChatStore.setState((s) =>
        s.activeSession ? { activeSession: { ...s.activeSession, ...patch } } : {},
      );
    },
    [],
  );

  const handleMessageUpdate = useCallback(
    (patch: Partial<ChatMessage> & { id: string }) => { updateMessage(patch.id, patch); },
    [updateMessage],
  );

  useChatRealtime({ sessionId, onNewMessage: handleNewMessage, onSessionUpdate: handleSessionUpdate, onMessageUpdate: handleMessageUpdate });
  const { sendTyping } = useChatPresence({ sessionId, myRole, onRemoteTyping: setRemoteTyping });

  async function handleSend(content: string, attachment?: PendingAttachment) {
    if (!activeSession) return;
    let attachmentData: { file_url: string; file_name: string; file_type: string; file_size: number } | undefined;
    if (attachment) {
      const fd = new FormData();
      fd.append("file", attachment.file);
      const res = await fetch("/api/chat/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) { toast.error(json.error ?? "Upload gagal"); throw new Error(json.error); }
      attachmentData = json.data;
    }
    const messageType = attachmentData?.file_type.startsWith("image/") ? "image" : attachmentData ? "file" : "text";
    const res = await fetch(`/api/chat/sessions/${activeSession.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content || null, message_type: messageType, attachment: attachmentData }),
    });
    const json = await res.json();
    if (!json.success) { toast.error(json.error ?? "Gagal mengirim"); throw new Error(json.error); }
  }

  async function handleReact(messageId: string, emoji: string) {
    const res = await fetch(`/api/chat/messages/${messageId}/react`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) toast.error("Gagal menambah reaksi");
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
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold">{activeSession?.subject ?? "Chat"}</span>
          <Badge variant={isResolved ? "secondary" : "default"} className="shrink-0 text-[10px]">
            {isResolved ? "Selesai" : "Aktif"}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!isResolved && myRole === "admin" && (
            <Button variant="ghost" size="sm" onClick={handleCloseSession} className="h-7 text-xs">
              Tutup Sesi
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onMinimize} aria-label="Minimize chat" className="h-7 w-7">
            <ChevronDown size={16} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {messages.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} myUserId={user?.id ?? ""} onReact={handleReact} />
        ))}
        {isRemoteTyping && <div className="mb-2"><ChatTypingIndicator /></div>}
        <div ref={bottomRef} />
      </div>

      {isResolved ? (
        <div className="flex shrink-0 items-center gap-2 border-t border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <AlertCircle size={14} className="shrink-0" />
          Sesi ini telah ditutup. Buka sesi baru untuk chat lagi.
        </div>
      ) : (
        <ChatInput onSend={handleSend} onTyping={sendTyping} disabled={!activeSession} />
      )}
    </div>
  );
}
