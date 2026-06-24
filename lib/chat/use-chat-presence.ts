"use client";
import { useEffect, useRef, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type PresenceState = { typing: boolean; sender_role: string };

type Options = {
  sessionId: string | null;
  myRole: "user" | "admin";
  onRemoteTyping: (typing: boolean) => void;
};

export function useChatPresence({ sessionId, myRole, onRemoteTyping }: Options) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable ref for callback
  const onRemoteTypingRef = useRef(onRemoteTyping);
  useEffect(() => { onRemoteTypingRef.current = onRemoteTyping; });

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    // Use a unique key per tab/instance to avoid multi-tab collision for admin
    const presenceKey = `${myRole}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase.channel(`chat-presence-${sessionId}`, {
      config: { presence: { key: presenceKey } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const otherRole = myRole === "user" ? "admin" : "user";
        // Check any entry where sender_role matches the other role and typing is true
        const isTyping = Object.values(state)
          .flat()
          .some((s) => s.sender_role === otherRole && s.typing);
        onRemoteTypingRef.current(isTyping);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      // Clear pending typing timer
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      supabase.removeChannel(channel);
      channelRef.current = null; // prevent stale track() calls
    };
  }, [sessionId, myRole]); // myRole is stable (user/admin doesn't change mid-session)

  const sendTyping = useCallback(() => {
    if (!channelRef.current) return;
    channelRef.current.track({ typing: true, sender_role: myRole });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      channelRef.current?.track({ typing: false, sender_role: myRole });
      typingTimerRef.current = null;
    }, 3000);
  }, [myRole]);

  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    channelRef.current?.track({ typing: false, sender_role: myRole });
  }, [myRole]);

  return { sendTyping, stopTyping };
}
