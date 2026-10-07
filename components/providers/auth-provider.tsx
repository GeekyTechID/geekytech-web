"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth-store";
import { markFirstLoginDoneAction } from "@/app/(dashboard)/dashboard/notifications/_actions";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading, setInitialized, reset } =
    useAuthStore();

  useEffect(() => {
    const supabase = createClient();
    let lastUserId: string | null = null;

    async function fetchProfile(userId: string) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(data);
      return data;
    }

    // Satu sumber kebenaran: onAuthStateChange menangani semua event
    // (INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, USER_UPDATED, TOKEN_REFRESHED)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;

      // Satu browser = satu akun. Jika tab lain login sebagai akun berbeda
      // (atau logout), muat ulang agar tab ini tidak menampilkan data/keranjang
      // akun lama sementara cookie sudah milik akun baru.
      const previousId = lastUserId;
      lastUserId = user?.id ?? null;
      const switchedAccount = previousId !== null && lastUserId !== null && previousId !== lastUserId;
      const signedOutElsewhere = previousId !== null && lastUserId === null && document.hidden;
      if (event !== "INITIAL_SESSION" && (switchedAccount || signedOutElsewhere)) {
        window.location.reload();
        return;
      }

      setUser(user);

      if (!user) {
        reset();
        setInitialized(true);
        return;
      }

      if (event === "INITIAL_SESSION") {
        // InitAuthStore (di layout) sudah pre-populate dari server;
        // hanya fetch jika store belum terisi untuk user ini.
        const existing = useAuthStore.getState().profile;
        if (!existing || existing.id !== user.id) {
          await fetchProfile(user.id);
        }
        setLoading(false);
        setInitialized(true);
      } else if (event === "SIGNED_IN") {
        const existing = useAuthStore.getState().profile;
        const profile =
          !existing || existing.id !== user.id
            ? await fetchProfile(user.id)
            : existing;
        if (profile && !profile.first_login_done) {
          toast.success(`Selamat datang di GeekyTech, ${profile.full_name ?? "Sobat Geek"}!`);
          markFirstLoginDoneAction();
        }
      } else if (event === "USER_UPDATED") {
        await fetchProfile(user.id);
      }
      // TOKEN_REFRESHED: profil tidak berubah, skip fetch
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setLoading, setInitialized, reset]);

  return <>{children}</>;
}
