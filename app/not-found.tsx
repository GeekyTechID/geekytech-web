import type { User } from "@supabase/supabase-js";
import Link from "next/link";

import { AnnouncementBarServer } from "@/components/layout/announcement-bar-server";
import { BottomNavBar } from "@/components/layout/bottom-nav-bar";
import { InitAuthStore } from "@/components/providers/init-auth-store";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { Button } from "@/components/ui/button";
import { fetchUserProfile } from "@/lib/data/dashboard-user";
import { fetchStoreHeaderCartCount, fetchStoreHeaderCategories } from "@/lib/data/store-header-server";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

async function fetchLayoutData(): Promise<{
  user: User | null;
  profile: Tables<"profiles"> | null;
  categories: Awaited<ReturnType<typeof fetchStoreHeaderCategories>>;
  initialCartCount: number;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [categories, initialCartCount, profile] = await Promise.all([
      fetchStoreHeaderCategories().catch(() => [] as Awaited<ReturnType<typeof fetchStoreHeaderCategories>>),
      fetchStoreHeaderCartCount().catch(() => 0),
      user ? fetchUserProfile(user.id).catch(() => null) : Promise.resolve(null),
    ]);

    return { user, profile, categories, initialCartCount };
  } catch {
    return { user: null, profile: null, categories: [], initialCartCount: 0 };
  }
}

export default async function NotFound() {
  const { user, profile, categories, initialCartCount } = await fetchLayoutData();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <InitAuthStore user={user} profile={profile} />
      <AnnouncementBarServer />
      <StoreHeader categories={categories} initialCartCount={initialCartCount} />
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <section className="flex min-h-[70vh] w-full items-center justify-center bg-white px-6 py-20">
          <div className="flex max-w-[560px] flex-col items-center text-center">

            {/* Signature: ghost product card — an empty shelf in the store's own language */}
            <div
              className="mb-10 w-[190px] overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white p-4"
              style={{ boxShadow: "rgba(0,0,0,0.22) 3px 5px 30px 0" }}
              aria-hidden="true"
            >
              <div className="mb-3 aspect-[4/3] w-full rounded-[8px] bg-[#f5f5f7]" />
              <div className="mb-2 h-3.5 w-4/5 rounded-full bg-[#f5f5f7]" />
              <div className="mb-3 h-3.5 w-3/5 rounded-full bg-[#f5f5f7]" />
              <div className="h-8 w-full rounded-full bg-[#f5f5f7]" />
            </div>

            <p className="mb-3 text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-[#EA5329]">
              Halaman Tidak Ditemukan
            </p>

            <h1 className="mb-4 text-[28px] font-semibold leading-[1.07] tracking-[-0.28px] text-[#1d1d1f] sm:text-[40px]">
              Sepertinya halaman ini belum ada.
            </h1>

            <p className="mb-8 max-w-[440px] text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-[#7a7a7a]">
              URL yang kamu masukkan tidak ditemukan, atau halaman ini sedang dalam persiapan. Jelajahi produk kami atau kembali ke beranda.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild variant="primary">
                <Link href="/">Ke Beranda</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/products">Lihat Produk</Link>
              </Button>
            </div>

          </div>
        </section>
      </main>
      <StoreFooter />
      <BottomNavBar />
    </div>
  );
}
