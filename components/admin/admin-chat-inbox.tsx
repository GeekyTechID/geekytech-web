"use client";
import { useCallback, useState } from "react";
import { AdminChatSessionList } from "./admin-chat-session-list";
import { AdminChatDetail } from "./admin-chat-detail";
import { useAdminChatRealtime } from "@/lib/chat/use-chat-realtime";
import type { ChatSession } from "@/types/chat";

type Props = {
  initialSessions: ChatSession[];
};

export function AdminChatInbox({ initialSessions }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [selected, setSelected] = useState<ChatSession | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/admin/chat/sessions");
    const json = await res.json();
    if (json.success) {
      setSessions(json.data);
      window.dispatchEvent(new Event("chat-unread-changed"));
    }
  }, []);

  useAdminChatRealtime(fetchSessions);

  function handleSessionUpdate(patch: Partial<ChatSession>) {
    setSessions((prev) =>
      prev.map((s) => (s.id === selected?.id ? { ...s, ...patch } : s)),
    );
    setSelected((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function handleSelect(session: ChatSession) {
    const readSession = { ...session, unread_count: 0 };
    setSessions((prev) =>
      prev.map((item) => (item.id === session.id ? readSession : item)),
    );
    setSelected(readSession);
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-xl border border-gray-300">
      <div className="w-72 shrink-0">
        <AdminChatSessionList
          sessions={sessions}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
          filter={filter}
          onFilterChange={setFilter}
        />
      </div>
      <div className="min-w-0 flex-1">
        {selected ? (
          <AdminChatDetail
            key={selected.id}
            session={selected}
            onSessionUpdate={handleSessionUpdate}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Pilih sesi untuk mulai chat
          </div>
        )}
      </div>
    </div>
  );
}
