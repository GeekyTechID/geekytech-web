"use client";
import { X, FileText } from "lucide-react";
import type { PendingAttachment } from "@/types/chat";

type Props = {
  attachment: PendingAttachment;
  onRemove: () => void;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatAttachmentPreview({ attachment, onRemove }: Props) {
  const isImage = attachment.file.type.startsWith("image/");

  return (
    <div className="relative flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2 pr-8">
      {isImage && attachment.preview_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachment.preview_url}
          alt={attachment.file.name}
          className="h-10 w-10 rounded object-cover shrink-0"
        />
      ) : (
        <FileText size={20} className="shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{attachment.file.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatBytes(attachment.file.size)}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 rounded-full p-0.5 hover:bg-muted transition-colors"
        aria-label="Hapus lampiran"
      >
        <X size={12} />
      </button>
    </div>
  );
}
