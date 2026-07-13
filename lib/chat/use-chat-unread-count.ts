"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Scope = "admin" | "user";

export function useChatUnreadCount(scope: Scope) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/unread-count");
      const json = (await response.json()) as { success?: boolean; count?: number };
      if (response.ok && json.success) setCount(Math.max(0, json.count ?? 0));
    } catch {
      // Keep the last known count when the network is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let intervalId: number | null = null;
    let initialTimeoutId: number | null = null;

    // The HTTP count does not depend on the browser Supabase session being
    // hydrated. Fetch it immediately so the sidebar badge is never held back
    // by realtime authentication setup.
    initialTimeoutId = window.setTimeout(() => void refresh(), 0);
    intervalId = window.setInterval(() => void refresh(), 30_000);
    const handleUnreadChange = () => void refresh();
    window.addEventListener("chat-unread-changed", handleUnreadChange);

    void supabase.auth.getSession().then(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`${scope}-sidebar-chat-unread`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chat_messages" },
          () => void refresh(),
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      window.removeEventListener("chat-unread-changed", handleUnreadChange);
      if (initialTimeoutId !== null) window.clearTimeout(initialTimeoutId);
      if (intervalId !== null) window.clearInterval(intervalId);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh, scope]);

  return count;
}
