import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchUserAddresses } from "@/lib/data/dashboard-user";
import { fetchUserCartWithLines } from "@/lib/data/user-cart-lines";
import { CheckoutPageClient } from "@/components/checkout/checkout-page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Selesaikan pembayaran pesanan GeekyTech Anda.",
};

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent("/checkout")}`);
  }

  const cart = await fetchUserCartWithLines(user.id);
  if (!cart || cart.lines.length === 0) {
    redirect("/cart");
  }

  const addresses = await fetchUserAddresses(user.id);
  if (addresses.length === 0) {
    redirect(`/dashboard/addresses/new?redirectTo=${encodeURIComponent("/checkout")}`);
  }

  const defaultAddr = addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? null;

  return (
    <CheckoutPageClient
      lines={cart.lines}
      addresses={addresses.map((a) => ({
        id: a.id,
        label: a.label,
        recipient: a.recipient,
        phone: a.phone,
        full_address: a.full_address,
        district: a.district,
        city: a.city,
        province: a.province,
        postal_code: a.postal_code,
        is_default: a.is_default,
      }))}
      initialAddressId={defaultAddr}
    />
  );
}
