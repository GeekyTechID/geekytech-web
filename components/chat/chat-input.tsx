"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChatAttachmentPreview } from "./chat-attachment-preview";
import {
  ALLOWED_CHAT_FILE_TYPES,
  CHAT_SIZE_LIMITS,
  type PendingAttachment,
} from "@/types/chat";
import { useChatStore } from "@/store/chat-store";
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

  const productContext = useChatStore((s) => s.productContext);
  const setProductContext = useChatStore((s) => s.setProductContext);

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
      let text = content.trim();
      if (productContext) {
        const ref = `\n\n— Produk: ${productContext.name}\n/products/${productContext.slug}`;
        text = text + ref;
      }
      await onSend(text, pending ?? undefined);
      setContent("");
      if (productContext) setProductContext(null);
      setPending((prev) => {
        if (prev?.preview_url) URL.revokeObjectURL(prev.preview_url);
        return null;
      });
    } finally {
      setSending(false);
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
    <div className="shrink-0 border-t border-[#e0e0e0] bg-[#f5f5f7] p-3">
      {/* Product context card */}
      {productContext && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-[#e0e0e0] bg-white p-2">
          {productContext.imageUrl && (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#f5f5f7]">
              <Image
                src={productContext.imageUrl}
                alt={productContext.name}
                fill
                className="object-contain p-0.5"
                sizes="40px"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[#1d1d1f]">{productContext.name}</p>
            <p className="truncate text-[10px] text-[#7a7a7a]">/products/{productContext.slug}</p>
          </div>
          <button
            type="button"
            onClick={() => setProductContext(null)}
            className="shrink-0 rounded-full p-1 text-[#7a7a7a] transition-colors hover:bg-[#f0f0f0] hover:text-[#1d1d1f]"
            aria-label="Hapus konteks produk"
          >
            <X size={12} />
          </button>
        </div>
      )}

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
          rows={2}
          disabled={disabled || sending}
          className={cn(
            "min-h-14 flex-1 resize-none rounded-2xl border border-[#e0e0e0] bg-white px-4 py-3 text-[15px] leading-[1.47]",
            "placeholder:text-[#7a7a7a] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/40",
            "max-h-40 overflow-y-auto",
          )}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
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
