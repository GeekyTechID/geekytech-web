import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { fetchUserCartWithLines } from "@/lib/data/user-cart-lines";
import { fetchAddressForUser } from "@/lib/data/dashboard-user";
import { fetchBiteshipCourierRates } from "@/lib/biteship/fetch-courier-rates";
import { MOCK_CHECKOUT_SHIPPING } from "@/lib/shipping/checkout-shipping-options";

const bodySchema = z.object({
  addressId: z.string().uuid(),
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

    const cart = await fetchUserCartWithLines(user.id);
    if (!cart || cart.lines.length === 0) {
      return Response.json({ success: false, error: "Keranjang kosong." }, { status: 400 });
    }

    const destPostal = postalToNumber(address.postal_code);
    if (destPostal == null) {
      return Response.json(
        { success: false, error: "Kode pos alamat tidak valid untuk perhitungan ongkir." },
        { status: 400 },
      );
    }

    const originRaw = process.env.BITESHIP_ORIGIN_POSTAL_CODE?.trim() ?? "10110";
    const originPostal = postalToNumber(originRaw) ?? 10110;

    const items = cart.lines.map((line) => ({
      name: `${line.productName} (${line.variantName})`.slice(0, 80),
      value: Math.max(1000, Math.round(line.unitPrice * line.qty)),
      quantity: line.qty,
      weight: line.weightGrams * line.qty,
      length: 12,
      width: 10,
      height: 8,
    }));

    const biteship = await fetchBiteshipCourierRates({
      originPostal,
      destinationPostal: destPostal,
      items,
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
