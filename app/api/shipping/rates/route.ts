import { z } from "zod";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchUserCartWithLines, fetchVariantAsBuyNowLine } from "@/lib/data/user-cart-lines";
import { fetchAddressForUser } from "@/lib/data/dashboard-user";
import { fetchBiteshipCourierRates } from "@/lib/biteship/fetch-courier-rates";
import { MOCK_CHECKOUT_SHIPPING } from "@/lib/shipping/checkout-shipping-options";

const bodySchema = z.object({
  addressId: z.string().uuid(),
  // buy-now mode: bypass cart lookup
  variantId: z.string().uuid().optional(),
  qty: z.number().int().min(1).optional(),
});

function postalToNumber(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 3) return null;
  const n = parseInt(digits.slice(0, 5), 10);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ success: false, error: "Permintaan tidak valid." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ success: false, error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    }

    const address = await fetchAddressForUser(user.id, parsed.data.addressId);
    if (!address) {
      return Response.json({ success: false, error: "Alamat tidak ditemukan." }, { status: 404 });
    }

    const destPostal = postalToNumber(address.postal_code);
    if (destPostal == null) {
      return Response.json(
        { success: false, error: "Kode pos alamat tidak valid untuk perhitungan ongkir." },
        { status: 400 },
      );
    }

    const originRaw = process.env.BITESHIP_ORIGIN_POSTAL?.trim() ?? "10110";
    const originPostal = postalToNumber(originRaw) ?? 10110;

    // build items: buy-now mode bypasses cart
    type ShippingItem = { name: string; value: number; quantity: number; weight: number; length: number; width: number; height: number };
    let items: ShippingItem[];

    if (parsed.data.variantId) {
      const qty = parsed.data.qty ?? 1;
      const line = await fetchVariantAsBuyNowLine(parsed.data.variantId, qty);
      if (!line) {
        return Response.json({ success: false, error: "Produk tidak ditemukan." }, { status: 404 });
      }
      items = [{
        name: `${line.productName} (${line.variantName})`.slice(0, 80),
        value: Math.max(1000, Math.round(line.unitPrice * qty)),
        quantity: qty,
        weight: Math.max(1, line.weightGrams * qty),
        length: 12,
        width: 10,
        height: 8,
      }];
    } else {
      const cart = await fetchUserCartWithLines(user.id);
      if (!cart || cart.lines.length === 0) {
        return Response.json({ success: false, error: "Keranjang kosong." }, { status: 400 });
      }
      items = cart.lines.map((line) => ({
        name: `${line.productName} (${line.variantName})`.slice(0, 80),
        value: Math.max(1000, Math.round(line.unitPrice * line.qty)),
        quantity: line.qty,
        weight: Math.max(1, line.weightGrams * line.qty),
        length: 12,
        width: 10,
        height: 8,
      }));
    }

    const { data: courierSetting } = await createServiceClient()
      .from("settings")
      .select("value")
      .eq("key", "active_couriers")
      .single();

    type StoredCourier = { courier_code: string; courier_service_code: string };
    const activeList = Array.isArray(courierSetting?.value)
      ? (courierSetting.value as StoredCourier[]).filter((c) => c.courier_code && c.courier_service_code)
      : [];

    // Biteship rates API only accepts plain courier codes (not "code:service" format).
    // Send unique courier codes, then post-filter to admin-selected services.
    const hasAdminSelection = activeList.length > 0;
    const uniqueCourierCodes = hasAdminSelection
      ? [...new Set(activeList.map((c) => c.courier_code.toLowerCase()))].join(",")
      : "jne,sicepat,anteraja,tiki";

    const biteship = await fetchBiteshipCourierRates({
      originPostal,
      destinationPostal: destPostal,
      items,
      couriers: uniqueCourierCodes,
    });

    if (biteship.ok) {
      const allowedKeys = hasAdminSelection
        ? new Set(activeList.map((c) => `${c.courier_code.toLowerCase()}:${c.courier_service_code.toLowerCase()}`))
        : null;
      const filtered = allowedKeys
        ? biteship.options.filter((o) => allowedKeys.has(`${o.courierCode.toLowerCase()}:${o.serviceCode.toLowerCase()}`))
        : biteship.options;

      return Response.json({
        success: true,
        data: {
          source: "biteship" as const,
          options: filtered.length > 0 ? filtered : biteship.options,
        },
      });
    }

    return Response.json({
      success: true,
      data: {
        source: "mock" as const,
        options: MOCK_CHECKOUT_SHIPPING,
        message: biteship.error,
      },
    });
  } catch {
    return Response.json({ success: false, error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
