import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AddressForm } from "@/components/dashboard/address-form";

export const metadata: Metadata = {
  title: "Tambah alamat",
};

export default async function NewAddressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/addresses/new");

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7a7a7a]">Alamat baru</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1d1d1f] sm:text-3xl">Tambah alamat</h1>
      <div className="mt-10">
        <AddressForm mode="create" />
      </div>
    </div>
  );
}
