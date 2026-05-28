// types/chat.ts
export type ChatSessionStatus = "open" | "resolved";
export type ChatSenderRole = "user" | "admin" | "system";
export type ChatMessageType = "text" | "image" | "file" | "system";

export type ChatSession = {
  id: string;
  user_id: string;
  status: ChatSessionStatus;
  subject: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  // joined from profiles
  profile?: { full_name: string | null; avatar_url: string | null; email?: string };
};

export type ChatAttachment = {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
};

export type ChatMessage = {
  id: string;
  session_id: string;
  sender_id: string;
  sender_role: ChatSenderRole;
  content: string | null;
  message_type: ChatMessageType;
  reactions: Record<string, string[]>; // { "👍": ["user_id_1"] }
  is_read: boolean;
  created_at: string;
  attachments?: ChatAttachment[];
};

export type ChatQuickReply = {
  id: string;
  shortcut: string;
  content: string;
  created_at: string;
};

export type PendingAttachment = {
  file: File;
  preview_url: string; // object URL for images, empty string for docs
};

export const ALLOWED_CHAT_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const CHAT_SIZE_LIMITS = {
  image: 500 * 1024,       // 500 KB
  document: 1024 * 1024,   // 1 MB
} satisfies Record<string, number>;
