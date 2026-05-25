import { createServiceClient } from "@/lib/supabase/server";

type NotifInput = {
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
};

export async function createNotification(input: NotifInput): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from("notifications").insert({
      user_id: input.userId,
      title: input.title,
      body: input.body,
      type: input.type,
      data: (input.data ?? null) as import("@/types/supabase").Json,
    });
  } catch {
    // Fire-and-forget — jangan sampai break flow utama
  }
}
