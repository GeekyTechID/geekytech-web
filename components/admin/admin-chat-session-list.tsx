"use client";
import { cn } from "@/lib/utils";
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
      <div className="flex shrink-0 border-b border-border">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onFilterChange(tab.key)}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold transition-colors",
              filter === tab.key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="p-4 text-xs text-muted-foreground">Tidak ada sesi.</p>
        )}
        {filtered.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelect(session)}
            className={cn(
              "flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left transition-colors",
              selectedId === session.id ? "bg-primary/5" : "hover:bg-muted/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="truncate text-sm font-medium">
                {session.profile?.full_name ?? "User"}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {timeAgo(session.updated_at)}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">{session.subject}</p>
            <span
              className={cn(
                "mt-0.5 w-fit rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                session.status === "open"
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500",
              )}
            >
              {session.status === "open" ? "Aktif" : "Selesai"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
