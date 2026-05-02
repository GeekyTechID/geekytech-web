"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading, setInitialized, reset } =
    useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    async function fetchProfile(userId: string) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(data);
    }

    // Inisialisasi: ambil user yang sedang aktif
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        await fetchProfile(user.id);
      }
      setLoading(false);
      setInitialized(true);
    }).catch(() => {
      setLoading(false);
      setInitialized(true);
    });

    // Dengarkan perubahan auth state (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      setUser(user);

      if (user) {
        await fetchProfile(user.id);
      } else {
        reset();
        setInitialized(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setLoading, setInitialized, reset]);

  return <>{children}</>;
}
