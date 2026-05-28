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
