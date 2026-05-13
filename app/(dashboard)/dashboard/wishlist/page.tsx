import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchWishlistForUser } from "@/lib/data/dashboard-user";
import { WishlistRemoveButton } from "@/components/dashboard/wishlist-remove-button";

export const metadata: Metadata = {
  title: "Wishlist",
};

export default async function WishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/wishlist");

  const items = await fetchWishlistForUser(user.id);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a7a7a]">Favorit</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1d1d1f] sm:text-3xl">Wishlist</h1>

      {items.length === 0 ? (
        <p className="mt-10 text-sm text-[#5c5c5c]">Wishlist kosong — jelajahi katalog dan simpan produk favoritmu.</p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.wishlistId} className="flex gap-4 rounded-xl border border-[#e0e0e0] bg-white p-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-[#e0e0e0] bg-[#fafafa]">
                {it.imageUrl ? <img src={it.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/products/${it.slug}`} className="font-semibold text-[#1d1d1f] hover:text-[#EA5329]">
                  {it.name}
                </Link>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                  <WishlistRemoveButton wishlistId={it.wishlistId} />
                  <Link href={`/products/${it.slug}`} className="text-xs font-semibold text-[#EA5329] underline">
                    Lihat detail
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
