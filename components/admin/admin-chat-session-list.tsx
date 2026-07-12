"use client";
import { Inbox } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdminChatStatusBadge } from "./admin-chat-status-badge";
import type { ChatSession } from "@/types/chat";

type Filter = "all" | "open" | "resolved";

type Props = {
  sessions: ChatSession[];
  selectedId: string | null;
  onSelect: (session: ChatSession) => void;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hr lalu`;
}

const FILTER_TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "open", label: "Aktif" },
  { key: "resolved", label: "Selesai" },
];

export function AdminChatSessionList({
  sessions, selectedId, onSelect, filter, onFilterChange,
}: Props) {
  const filtered = filter === "all" ? sessions : sessions.filter((s) => s.status === filter);

  return (
    <div className="flex h-full flex-col border-r border-border">
      <div className="shrink-0 border-b border-border p-2">
        <Tabs value={filter} onValueChange={(v) => onFilterChange(v as Filter)}>
          <TabsList variant="line" className="w-full">
            {FILTER_TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="flex-1">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Inbox size={24} className="text-muted-foreground/50" aria-hidden />
            <p className="text-xs text-muted-foreground">Tidak ada sesi.</p>
          </div>
        ) : (
          filtered.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelect(session)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors",
                selectedId === session.id ? "bg-primary/5" : "hover:bg-muted/40",
              )}
            >
              <Avatar size="sm" className="mt-0.5">
                <AvatarImage src={session.profile?.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="text-[10px] font-semibold">
                  {getInitials(session.profile?.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {session.profile?.full_name ?? "User"}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {timeAgo(session.updated_at)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{session.subject}</p>
                <AdminChatStatusBadge status={session.status} className="mt-1.5" />
              </div>
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
