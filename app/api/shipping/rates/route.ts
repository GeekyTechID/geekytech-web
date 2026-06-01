import { z } from "zod";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchUserCartWithLines, fetchVariantAsBuyNowLine } from "@/lib/data/user-cart-lines";
import { fetchAddressForUser } from "@/lib/data/dashboard-user";
import { fetchBiteshipCourierRates } from "@/lib/biteship/fetch-courier-rates";
import { fetchCoordinatesFromPostal } from "@/lib/biteship/fetch-area-coordinates";

const ON_DEMAND_COURIERS = new Set(["gojek", "grab", "gosend", "borzo", "lalamove", "deliveree", "rara"]);

function parseOriginCoords(): { lat: number; lng: number } | null {
  // Prioritas 1: combined "lat,lng"
  const combined = process.env.GOJEK_GOSEND_LAT_LANG?.trim();
  if (combined) {
    const [lat, lng] = combined.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  // Prioritas 2: individual
  const lat = Number(process.env.GOJEK_GOSEND_LAT?.trim());
  const lng = Number(process.env.GOJEK_GOSEND_LANG?.trim() ?? process.env.GOJEK_GOSEN_LANG?.trim());
  if (Number.isFinite(lat) && lat !== 0 && Number.isFinite(lng) && lng !== 0) return { lat, lng };
  return null;
}

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

    const svc = await createServiceClient();
    const [courierResult, originResult] = await Promise.all([
      svc.from("settings").select("value").eq("key", "active_courier_codes").single(),
      svc.from("settings").select("value").eq("key", "store_origin").single(),
    ]);

    const activeCodes = Array.isArray(courierResult.data?.value)
      ? (courierResult.data.value as string[]).filter((c) => typeof c === "string" && c)
      : [];

    if (activeCodes.length === 0) {
      return Response.json(
        { success: false, error: "Belum ada kurir yang diaktifkan. Silakan hubungi admin." },
        { status: 503 },
      );
    }

    // Baca kode pos origin dari store_origin di DB (dikonfigurasi admin di Pengaturan → Pengiriman).
    // Fallback ke env var, lalu ke default Jakarta Pusat.
    const storeOrigin = originResult.data?.value as { postal_code?: string } | null;
    const originRaw =
      storeOrigin?.postal_code?.trim() ||
      process.env.BITESHIP_ORIGIN_POSTAL?.trim() ||
      "10110";
    const originPostal = postalToNumber(originRaw) ?? 10110;

    // Koordinat origin (dari env) + dest (dari Biteship Area API) untuk on-demand kurir.
    // Fetch dest coords hanya jika ada on-demand courier di active list.
    const originCoords = parseOriginCoords();
    const hasOnDemand = originCoords !== null && activeCodes.some((c) => ON_DEMAND_COURIERS.has(c.toLowerCase()));
    const destCoords = hasOnDemand
      ? await fetchCoordinatesFromPostal(String(destPostal))
      : null;

    const biteship = await fetchBiteshipCourierRates({
      originPostal,
      destinationPostal: destPostal,
      items,
      couriers: activeCodes.join(","),
      originLat: originCoords?.lat,
      originLng: originCoords?.lng,
      destLat: destCoords?.lat,
      destLng: destCoords?.lng,
    });

    if (biteship.ok) {
      return Response.json({
        success: true,
        data: {
          source: "biteship" as const,
          options: biteship.options,
        },
      });
    }

    return Response.json(
      { success: false, error: `Layanan pengiriman tidak tersedia saat ini: ${biteship.error}` },
      { status: 503 },
    );
  } catch {
    return Response.json({ success: false, error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
