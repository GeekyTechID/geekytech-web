import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import type { ChatSenderRole, ChatSession } from "@/types/chat";

export async function withSessionUnreadCounts(
  sessions: ChatSession[],
  senderRole: Extract<ChatSenderRole, "admin" | "user">,
): Promise<ChatSession[]> {
  if (sessions.length === 0) return sessions;

  const service = createServiceClient();
  const { data, error } = await service
    .from("chat_messages")
    .select("session_id")
    .in("session_id", sessions.map((session) => session.id))
    .eq("sender_role", senderRole)
    .eq("is_read", false);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const message of data ?? []) {
    counts.set(message.session_id, (counts.get(message.session_id) ?? 0) + 1);
  }

  return sessions.map((session) => ({
    ...session,
    unread_count: counts.get(session.id) ?? 0,
  }));
}
