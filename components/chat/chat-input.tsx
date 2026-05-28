"use client";
import { useRef, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChatAttachmentPreview } from "./chat-attachment-preview";
import {
  ALLOWED_CHAT_FILE_TYPES,
  CHAT_SIZE_LIMITS,
  type PendingAttachment,
} from "@/types/chat";
import { cn } from "@/lib/utils";

type Props = {
  onSend: (content: string, attachment?: PendingAttachment) => Promise<void>;
  onTyping: () => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, onTyping, disabled }: Props) {
  const [content, setContent] = useState("");
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;

    if (!ALLOWED_CHAT_FILE_TYPES.includes(file.type as never)) {
      toast.error("Tipe file tidak diizinkan (gambar, PDF, atau Word)");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const limit = isImage ? CHAT_SIZE_LIMITS.image : CHAT_SIZE_LIMITS.document;
    if (file.size > limit) {
      toast.error(`Ukuran file melebihi batas ${isImage ? "500 KB" : "1 MB"}`);
      return;
    }

    const preview_url = isImage ? URL.createObjectURL(file) : "";
    setPending({ file, preview_url });
  }

  async function handleSend() {
    if ((!content.trim() && !pending) || sending || disabled) return;
    setSending(true);
    try {
      await onSend(content.trim(), pending ?? undefined);
      setContent("");
      setPending((prev) => {
        if (prev?.preview_url) URL.revokeObjectURL(prev.preview_url);
        return null;
      });
    } finally {
      setSending(false);
      // Always reset height and restore focus, even on error
      if (textRef.current) {
        textRef.current.style.height = "auto";
        textRef.current.focus();
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleRemovePending() {
    if (pending?.preview_url) URL.revokeObjectURL(pending.preview_url);
    setPending(null);
  }

  const canSend = (content.trim().length > 0 || !!pending) && !disabled && !sending;

  return (
    <div className="border-t border-border bg-background p-3">
      {pending && (
        <div className="mb-2">
          <ChatAttachmentPreview attachment={pending} onRemove={handleRemovePending} />
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept={ALLOWED_CHAT_FILE_TYPES.join(",")}
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || !!pending || sending}
          className={cn(
            "shrink-0 rounded-full p-2 text-muted-foreground",
            "hover:bg-muted hover:text-foreground transition-colors",
            (disabled || !!pending || sending) && "opacity-50 cursor-not-allowed",
          )}
          aria-label="Lampirkan file"
        >
          <Paperclip size={18} />
        </button>

        <textarea
          ref={textRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            onTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ketik pesan... (Enter untuk kirim, Shift+Enter untuk baris baru)"
          rows={1}
          disabled={disabled || sending}
          className={cn(
            "flex-1 resize-none rounded-2xl border border-border bg-muted/40 px-3 py-2 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary",
            "max-h-28 overflow-y-auto",
          )}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
          }}
        />

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          className="shrink-0 rounded-full"
          aria-label="Kirim pesan"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
