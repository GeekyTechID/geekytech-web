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
        (payload) => onMessageUpdate?.(payload.new as Partial<ChatMessage> & { id: string }),
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
