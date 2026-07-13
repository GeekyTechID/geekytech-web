"use client";
import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatQuickReply } from "@/types/chat";

type Props = {
  replies: ChatQuickReply[];
  onSelect: (content: string) => void;
  onClose: () => void;
};

export function AdminQuickReplyPicker({ replies, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  if (replies.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-20 mb-1 w-72 rounded-xl border border-gray-300 bg-background shadow-lg"
    >
      <p className="border-b border-gray-300 px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground">
        Quick Replies
      </p>
      <ScrollArea className="max-h-48">
        {replies.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => { onSelect(r.content); onClose(); }}
            className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted/40"
          >
            <span className="text-xs font-semibold text-primary">{r.shortcut}</span>
            <span className="truncate text-xs text-muted-foreground">{r.content}</span>
          </button>
        ))}
      </ScrollArea>
    </div>
  );
}
