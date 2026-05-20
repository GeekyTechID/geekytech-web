import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchUserAddresses } from "@/lib/data/dashboard-user";
import { fetchUserCartWithLines } from "@/lib/data/user-cart-lines";
import { CheckoutPageClient, type AvailableCoupon } from "@/components/checkout/checkout-page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Selesaikan pembayaran pesanan GeekyTech Anda.",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string }>;
}) {
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

  const { items: itemsParam } = await searchParams;
  const selectedIds = itemsParam
    ? new Set(itemsParam.split(",").filter(Boolean))
    : null;

  const lines =
    selectedIds && selectedIds.size > 0
      ? cart.lines.filter((l) => selectedIds.has(l.lineId))
      : cart.lines;

  if (lines.length === 0) {
    redirect("/cart");
  }

  const addresses = await fetchUserAddresses(user.id);
  if (addresses.length === 0) {
    redirect(`/dashboard/addresses/new?redirectTo=${encodeURIComponent("/checkout")}`);
  }

  const defaultAddr = addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? null;

  const now = new Date().toISOString();
  const { data: couponRows } = await supabase
    .from("coupons")
    .select("id, code, title, description, type, value, min_purchase, max_discount, max_usage, used_count, valid_until, image_url, applies_to, applies_to_ids")
    .eq("is_active", true)
    .or(`valid_from.is.null,valid_from.lte.${now}`)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .order("created_at", { ascending: false });

  const availableCoupons: AvailableCoupon[] = (couponRows ?? [])
    .filter((c) => c.max_usage == null || (c.used_count ?? 0) < c.max_usage)
    .map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title ?? null,
      description: c.description ?? null,
      type: c.type as "percentage" | "fixed",
      value: Number(c.value),
      min_purchase: Number(c.min_purchase ?? 0),
      max_discount: c.max_discount != null ? Number(c.max_discount) : null,
      valid_until: c.valid_until ?? null,
      image_url: c.image_url ?? null,
      applies_to: c.applies_to as "all" | "product" | "category" | "brand",
      applies_to_ids: c.applies_to_ids ?? [],
    }));

  return (
    <CheckoutPageClient
      lines={lines}
      availableCoupons={availableCoupons}
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
