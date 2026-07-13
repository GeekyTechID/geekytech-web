"use client";
import { useCallback, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  HeaderDropdownPanelBody,
  HeaderDropdownPanelHeader,
} from "@/components/shared/header-dropdown-panel";
import { Button } from "@/components/ui/button";
import { ChatInput } from "./chat-input";
import { ChatMessageStream } from "./chat-message-stream";
import { useChatStore } from "@/store/chat-store";
import { useChatRealtime } from "@/lib/chat/use-chat-realtime";
import { useChatPresence } from "@/lib/chat/use-chat-presence";
import { useAuthStore } from "@/store/auth-store";
import type { ChatMessage, ChatSession, PendingAttachment } from "@/types/chat";

export function ChatPopup() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const {
    isOpen,
    activeSession,
    messages,
    isRemoteTyping,
    setMessages,
    addMessage,
    updateMessage,
    setRemoteTyping,
    incrementUnread,
    setUnreadCount,
  } = useChatStore();

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
      <HeaderDropdownPanelHeader
        title={activeSession?.subject ?? "Chat"}
        badge={
          <Badge
            variant={isResolved ? "secondary" : "default"}
            className="shrink-0 border-0 bg-white/15 text-[10px] text-white hover:bg-white/15"
          >
            {isResolved ? "Selesai" : "Aktif"}
          </Badge>
        }
        trailing={
          !isResolved && myRole === "admin" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCloseSession}
              className="h-7 shrink-0 text-xs text-white/90 hover:bg-white/10 hover:text-white"
            >
              Tutup Sesi
            </Button>
          ) : null
        }
      />

      <HeaderDropdownPanelBody className="flex min-h-0 flex-1 flex-col">
      <ChatMessageStream
        key={sessionId ?? "empty"}
        messages={messages}
        myUserId={user?.id ?? ""}
        onReact={handleReact}
        isRemoteTyping={isRemoteTyping}
      />

      {isResolved ? (
        <div className="flex shrink-0 items-center gap-2 border-t border-[#e0e0e0] bg-[#f5f5f7] p-3 text-xs text-[#7a7a7a]">
          <AlertCircle size={14} className="shrink-0" />
          Sesi ini telah ditutup. Buka sesi baru untuk chat lagi.
        </div>
      ) : (
        <ChatInput onSend={handleSend} onTyping={sendTyping} disabled={!activeSession} />
      )}
      </HeaderDropdownPanelBody>
    </div>
  );
}
