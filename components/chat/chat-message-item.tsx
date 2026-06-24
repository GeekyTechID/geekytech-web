"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { FileText, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmojiReactionPicker } from "./emoji-reaction-picker";
import type { ChatMessage } from "@/types/chat";

type Props = {
  message: ChatMessage;
  myUserId: string;
  onReact: (messageId: string, emoji: string) => void;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatMessageItem({ message, myUserId, onReact }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPicker]);

  if (message.sender_role === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
          {message.content}
        </span>
      </div>
    );
  }

  const isMine = message.sender_id === myUserId;
  const attachment = message.attachments?.[0];
  const isImage = attachment?.file_type.startsWith("image/");
  const reactions = (message.reactions ?? {}) as Record<string, string[]>;
  const hasReactions = Object.keys(reactions).length > 0;

  return (
    <div
      className={cn(
        "group flex flex-col gap-0.5 my-1",
        isMine ? "items-end" : "items-start",
      )}
    >
      <div className="relative max-w-[75%]">
        {/* Reaction picker trigger */}
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className={cn(
            "absolute top-0 z-10 hidden group-hover:flex items-center justify-center",
            "h-6 w-6 rounded-full border border-border bg-background shadow-sm text-xs",
            isMine ? "-left-7" : "-right-7",
          )}
          aria-label="Tambah reaksi"
        >
          😊
        </button>

        {/* Emoji picker popover */}
        {showPicker && (
          <div
            ref={pickerRef}
            className={cn(
              "absolute bottom-full z-20 mb-1",
              isMine ? "right-0" : "left-0",
            )}
          >
            <EmojiReactionPicker
              onSelect={(emoji) => {
                onReact(message.id, emoji);
                setShowPicker(false);
              }}
            />
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm",
            isMine
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm bg-muted text-foreground",
          )}
        >
          {/* Image attachment */}
          {attachment && isImage && (
            <a
              href={attachment.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mb-1"
            >
              <Image
                src={attachment.file_url}
                alt={attachment.file_name}
                width={200}
                height={150}
                className="rounded-lg object-cover"
              />
            </a>
          )}

          {/* File attachment */}
          {attachment && !isImage && (
            <a
              href={attachment.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mb-1 flex items-center gap-2 rounded-lg p-2",
                "border border-border/40 bg-black/5",
              )}
            >
              <FileText size={16} className="shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{attachment.file_name}</p>
                <p className="text-[10px] opacity-70">{formatBytes(attachment.file_size)}</p>
              </div>
            </a>
          )}

          {message.content && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>
      </div>

      {/* Reactions display */}
      {hasReactions && (
        <div className="flex flex-wrap gap-0.5 px-1">
          {Object.entries(reactions).map(([emoji, uids]) =>
            uids.length === 0 ? null : (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(message.id, emoji)}
                className={cn(
                  "flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs",
                  uids.includes(myUserId)
                    ? "border-primary/30 bg-primary/10"
                    : "border-border bg-muted/40",
                )}
              >
                <span>{emoji}</span>
                {uids.length > 1 && (
                  <span className="text-[10px]">{uids.length}</span>
                )}
              </button>
            ),
          )}
        </div>
      )}

      {/* Timestamp + read receipt */}
      <div
        className={cn(
          "flex items-center gap-1 px-1",
          isMine ? "flex-row-reverse" : "flex-row",
        )}
      >
        <span className="text-[10px] text-muted-foreground">
          {formatTime(message.created_at)}
        </span>
        {isMine && (
          message.is_read ? (
            <CheckCheck size={12} className="text-primary" />
          ) : (
            <Check size={12} className="text-muted-foreground" />
          )
        )}
      </div>
    </div>
  );
}
