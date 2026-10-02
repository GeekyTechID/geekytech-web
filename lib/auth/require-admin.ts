import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Server actions are public POST endpoints — proxy.ts only guards /admin/* page
 * requests, so every admin action must check the caller itself before touching
 * the service-role client. Throws for non-admins; returns the admin's user id.
 */
export async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Tidak terautentikasi.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") throw new Error("Akses ditolak.");

  return user.id;
}
