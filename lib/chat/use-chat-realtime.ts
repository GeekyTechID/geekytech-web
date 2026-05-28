"use client";
import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
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
  // Store callbacks in refs to avoid stale-closure reconnect loops
  const onNewMessageRef = useRef(onNewMessage);
  const onSessionUpdateRef = useRef(onSessionUpdate);
  const onMessageUpdateRef = useRef(onMessageUpdate);

  useEffect(() => { onNewMessageRef.current = onNewMessage; });
  useEffect(() => { onSessionUpdateRef.current = onSessionUpdate; });
  useEffect(() => { onMessageUpdateRef.current = onMessageUpdate; });

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const channel: RealtimeChannel = supabase
      .channel(`chat-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => onNewMessageRef.current(payload.new as ChatMessage),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) =>
          onMessageUpdateRef.current?.(payload.new as Partial<ChatMessage> & { id: string }),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => onSessionUpdateRef.current(payload.new as Partial<ChatSession>),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]); // only sessionId — callbacks are stable via refs
}

// Hook for admin: subscribe to all session changes
export function useAdminChatRealtime(onSessionChange: () => void) {
  const onSessionChangeRef = useRef(onSessionChange);
  useEffect(() => { onSessionChangeRef.current = onSessionChange; });

  useEffect(() => {
    const supabase = createClient();
    const channel: RealtimeChannel = supabase
      .channel("admin-chat-sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        () => onSessionChangeRef.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // no deps — stable via ref
}
