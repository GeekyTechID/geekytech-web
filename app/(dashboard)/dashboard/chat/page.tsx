import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ChatSession } from "@/types/chat";

export const metadata: Metadata = { title: "Chat CS" };

async function fetchUserSessions(userId: string): Promise<ChatSession[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as ChatSession[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function DashboardChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/chat");

  const sessions = await fetchUserSessions(user.id);

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold uppercase text-[#7a7a7a]">Akun</p>
      <h1 className="mt-2 text-2xl font-bold text-[#1d1d1f] sm:text-3xl">Riwayat Chat</h1>

      {sessions.length === 0 ? (
        <p className="mt-10 text-sm text-[#5c5c5c]">
          Belum ada riwayat chat. Klik tombol chat di pojok kanan bawah untuk mulai.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="rounded-xl border border-[#e8e4dc] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#1d1d1f]">{session.subject}</p>
                  <p className="mt-0.5 text-xs text-[#7a7a7a]">{formatDate(session.updated_at)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    session.status === "open"
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {session.status === "open" ? "Aktif" : "Selesai"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
