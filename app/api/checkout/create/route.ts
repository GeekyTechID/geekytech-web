import { z } from "zod";
import { createRequire } from "node:module";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { createAdminNotification } from "@/lib/notifications/create-admin-notification";
import { sendOrderConfirmation } from "@/lib/email/send-order-confirmation";
import { fetchUserCartWithLines, fetchVariantAsBuyNowLine } from "@/lib/data/user-cart-lines";
import type { CartLineView } from "@/components/store/cart-line-card";
import { fetchAddressForUser } from "@/lib/data/dashboard-user";
import { computeCouponDiscount } from "@/lib/checkout/coupon-discount";
import { fetchBiteshipCourierRates } from "@/lib/biteship/fetch-courier-rates";
import { fetchCoordinatesFromPostal } from "@/lib/geo/geocode-destination";
import {
  ON_DEMAND_COURIERS,
  isOnDemandSameDayOption,
  isWithinSameDayWindow,
  parseOriginCoords,
} from "@/lib/shipping/on-demand-coords";
import { getSnapPaymentConfig } from "@/lib/midtrans/snap-payment-config";

const bodySchema = z.object({
  addressId: z.string().uuid(),
  courierCode: z.string().min(1).max(40),
  serviceCode: z.string().min(1).max(40),
  ratesSource: z.enum(["biteship"]),
  couponCode: z.string().max(64).optional().nullable(),
  lineIds: z.array(z.string()).min(1).optional().nullable(),
  buyNow: z.object({ variantId: z.string().uuid(), qty: z.number().int().min(1) }).optional().nullable(),
});

function postalToNumber(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 3) return null;
  const n = parseInt(digits.slice(0, 5), 10);
  return Number.isFinite(n) ? n : null;
}

async function resolveShippingPrice(params: {
  courierCode: string;
  serviceCode: string;
  originPostal: number;
  destinationPostal: number;
  items: { name: string; value: number; quantity: number; weight: number }[];
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
}): Promise<
  | { ok: true; price: number; courierName: string; serviceName: string; etd: string }
  | { ok: false; error: string }
> {
  const c = params.courierCode.toLowerCase();
  const s = params.serviceCode.toLowerCase();

  const res = await fetchBiteshipCourierRates({
    originPostal: params.originPostal,
    destinationPostal: params.destinationPostal,
    items: params.items.map((i) => ({ ...i, length: 12, width: 10, height: 8 })),
    couriers: c,
    originLat: params.originLat,
    originLng: params.originLng,
    destLat: params.destLat,
    destLng: params.destLng,
  });

  if (res.ok) {
    const hit = res.options.find(
      (o) => o.courierCode.toLowerCase() === c && o.serviceCode.toLowerCase() === s,
    );
    if (hit) {
      return { ok: true, price: hit.price, courierName: hit.courierName, serviceName: hit.serviceName, etd: hit.etd };
    }
  }

  return { ok: false, error: "Metode pengiriman tidak tersedia untuk rute ini." };
}

export async function POST(req: Request) {
  let createdOrderId: string | null = null;
  try {
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ success: false, error: "Permintaan tidak valid." }, { status: 400 });
    }

    // Block Same Day on-demand (Gojek/Grab) outside Biteship pickup window — would be
    // rejected at settlement and leave the order stuck without a shipment.
    if (
      isOnDemandSameDayOption(parsed.data.courierCode, parsed.data.serviceCode) &&
      !isWithinSameDayWindow()
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Layanan Same Day hanya tersedia pukul 06:00–14:00 WIB. Pilih kurir lain atau pesan kembali besok pagi.",
        },
        { status: 400 },
      );
    }

    const auth = await createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) {
      return Response.json({ success: false, error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    }

    const address = await fetchAddressForUser(user.id, parsed.data.addressId);
    if (!address) {
      return Response.json({ success: false, error: "Alamat tidak ditemukan." }, { status: 404 });
    }

    let orderLines: CartLineView[];
    let cartId: string | null = null;

    if (parsed.data.buyNow) {
      const buyNowLine = await fetchVariantAsBuyNowLine(
        parsed.data.buyNow.variantId,
        parsed.data.buyNow.qty,
      );
      if (!buyNowLine) {
        return Response.json({ success: false, error: "Produk tidak tersedia." }, { status: 400 });
      }
      orderLines = [buyNowLine];
    } else {
      const cart = await fetchUserCartWithLines(user.id);
      if (!cart || cart.lines.length === 0) {
        return Response.json({ success: false, error: "Keranjang kosong." }, { status: 400 });
      }
      cartId = cart.cartId;
      const requestedIds = parsed.data.lineIds?.length ? new Set(parsed.data.lineIds) : null;
      orderLines = requestedIds
        ? cart.lines.filter((l) => requestedIds.has(l.lineId))
        : cart.lines;
      if (orderLines.length === 0) {
        return Response.json({ success: false, error: "Tidak ada item yang valid untuk dipesan." }, { status: 400 });
      }
    }

    for (const line of orderLines) {
      const { data: v } = await auth
        .from("product_variants")
        .select("stock, reserved")
        .eq("id", line.variantId)
        .single();
      const stock = v?.stock ?? 0;
      const reserved = v?.reserved ?? 0;
      if (stock - reserved < line.qty) {
        return Response.json(
          { success: false, error: `Stok tidak cukup untuk ${line.productName}.` },
          { status: 400 },
        );
      }
    }

    const destPostal = postalToNumber(address.postal_code);
    if (destPostal == null) {
      return Response.json(
        { success: false, error: "Kode pos alamat tidak valid untuk pengiriman." },
        { status: 400 },
      );
    }

    const svcForSettings = createServiceClient();
    const [originSettingsResult] = await Promise.all([
      svcForSettings.from("settings").select("value").eq("key", "store_origin").maybeSingle(),
    ]);
    const storeOriginSettings = (originSettingsResult.data?.value ?? null) as { postal_code?: string; lat?: string; lng?: string } | null;

    const originPostal =
      postalToNumber(storeOriginSettings?.postal_code?.trim() ?? "") ??
      postalToNumber((process.env.BITESHIP_ORIGIN_POSTAL ?? process.env.BITESHIP_ORIGIN_POSTAL_CODE)?.trim() ?? "10110") ??
      10110;

    const itemsForShip = orderLines.map((line) => ({
      name: `${line.productName} (${line.variantName})`.slice(0, 80),
      value: Math.max(1000, Math.round(line.unitPrice * line.qty)),
      quantity: line.qty,
      weight: line.weightGrams * line.qty,
    }));

    const originCoords = parseOriginCoords(storeOriginSettings);
    const isOnDemand = ON_DEMAND_COURIERS.has(parsed.data.courierCode.toLowerCase());
    const destCoords =
      originCoords && isOnDemand ? await fetchCoordinatesFromPostal(String(destPostal)) : null;

    const ship = await resolveShippingPrice({
      courierCode: parsed.data.courierCode,
      serviceCode: parsed.data.serviceCode,
      originPostal,
      destinationPostal: destPostal,
      items: itemsForShip,
      originLat: originCoords?.lat,
      originLng: originCoords?.lng,
      destLat: destCoords?.lat,
      destLng: destCoords?.lng,
    });
    if (!ship.ok) {
      return Response.json({ success: false, error: ship.error }, { status: 400 });
    }

    const subtotal = orderLines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    const subtotalRounded = Math.round(subtotal);

    let discountAmount = 0;
    let couponId: string | null = null;
    let couponCodeStored: string | null = null;

    const rawCoupon = parsed.data.couponCode?.trim();
    if (rawCoupon) {
      const { data: coupon } = await auth
        .from("coupons")
        .select("id, code, type, value, min_purchase, max_discount, valid_from, valid_until, used_count, max_usage, is_active, applies_to, applies_to_ids")
        .ilike("code", rawCoupon.toUpperCase())
        .maybeSingle();

      if (!coupon) {
        return Response.json({ success: false, error: "Kode kupon tidak dikenal." }, { status: 400 });
      }

      const { data: usage } = await auth
        .from("coupon_usages")
        .select("id")
        .eq("coupon_id", coupon.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (usage) {
        return Response.json({ success: false, error: "Anda sudah pernah menggunakan kupon ini." }, { status: 400 });
      }

      const cartLinesForCoupon = orderLines.map((l) => ({
        productId: l.productId,
        categoryId: l.categoryId,
        brandId: l.brandId,
        unitPrice: l.unitPrice,
        qty: l.qty,
      }));
      const disc = computeCouponDiscount(subtotalRounded, coupon, cartLinesForCoupon);
      if (!disc.ok) {
        return Response.json({ success: false, error: disc.error }, { status: 400 });
      }
      discountAmount = disc.data.discountAmount;
      couponId = disc.data.couponId;
      couponCodeStored = disc.data.code;
    }

    const APP_SERVICE_FEE = 1000;
    const shippingCost = ship.price;
    const total = Math.max(0, subtotalRounded - discountAmount + shippingCost + APP_SERVICE_FEE);
    if (total < 1000) {
      return Response.json({ success: false, error: "Total pembayaran terlalu kecil." }, { status: 400 });
    }

    const svc = createServiceClient();

    const { data: order, error: orderErr } = await svc
      .from("orders")
      .insert({
        user_id: user.id,
        recipient_name: address.recipient,
        recipient_phone: address.phone,
        shipping_province: address.province,
        shipping_city: address.city,
        shipping_district: address.district,
        shipping_postal: address.postal_code,
        shipping_address: address.full_address,
        shipping_lat: address.lat ?? null,
        shipping_lng: address.lng ?? null,
        subtotal: subtotalRounded,
        shipping_cost: shippingCost,
        shipping_insurance: 0,
        discount_amount: discountAmount,
        app_fee: APP_SERVICE_FEE,
        total,
        courier_company: parsed.data.courierCode.toLowerCase(),
        courier_service: parsed.data.serviceCode,
        courier_etd: ship.etd,
        coupon_id: couponId,
        coupon_code: couponCodeStored,
      })
      .select("id, order_number")
      .single();

    if (orderErr || !order) {
      return Response.json({ success: false, error: "Gagal membuat pesanan." }, { status: 500 });
    }
    createdOrderId = order.id;

    const orderItems = orderLines.map((line) => ({
      order_id: order.id,
      variant_id: line.variantId,
      product_name: line.productName,
      variant_name: line.variantName,
      sku: line.sku,
      price: Math.round(line.unitPrice),
      quantity: line.qty,
      subtotal: Math.round(line.unitPrice * line.qty),
      weight: line.weightGrams * line.qty,
      image_url: line.images[0]?.url ?? null,
    }));

    const { error: itemsErr } = await svc.from("order_items").insert(orderItems);
    if (itemsErr) {
      await svc.from("orders").delete().eq("id", order.id);
      return Response.json({ success: false, error: "Gagal menyimpan item pesanan." }, { status: 500 });
    }

    const { error: payErr } = await svc.from("payments").insert({
      order_id: order.id,
      midtrans_order_id: order.order_number,
      gross_amount: total,
      status: "pending",
      payment_type: null,
    });
    if (payErr) {
      await svc.from("orders").delete().eq("id", order.id);
      return Response.json({ success: false, error: "Gagal menyimpan pembayaran." }, { status: 500 });
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim();
    let snapToken: string | null = null;

    if (serverKey && clientKey) {
      try {
        const require = createRequire(import.meta.url);
        const Midtrans = require("midtrans-client") as {
          Snap: new (options: { isProduction: boolean; serverKey: string; clientKey: string }) => {
            createTransaction: (parameter: Record<string, unknown>) => Promise<{ token: string }>;
          };
        };

        const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
        const snap = new Midtrans.Snap({
          isProduction,
          serverKey,
          clientKey,
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
        const orderUrl = appUrl
          ? `${appUrl}/dashboard/orders/${order.id}`
          : null;

        const snapRes = await snap.createTransaction({
          transaction_details: {
            order_id: order.order_number,
            gross_amount: total,
          },
          item_details: [
            {
              id: order.id.slice(0, 12),
              price: total,
              quantity: 1,
              name: `Pesanan ${order.order_number}`,
            },
          ],
          customer_details: {
            first_name: address.recipient.slice(0, 40),
            email: user.email ?? "customer@geekytech.local",
            phone: address.phone.replace(/\D/g, "").slice(0, 20) || "081000000000",
          },
          ...getSnapPaymentConfig(isProduction, orderUrl),
          ...(orderUrl
            ? {
                callbacks: {
                  finish: orderUrl,
                },
                gopay: {
                  enable_callback: true,
                  callback_url: orderUrl,
                },
              }
            : {}),
        });
        snapToken = snapRes.token;
      } catch {
        await svc.from("orders").delete().eq("id", order.id);
        return Response.json(
          { success: false, error: "Gagal membuat sesi pembayaran Midtrans. Pesanan dibatalkan." },
          { status: 502 },
        );
      }
    }

    for (const line of orderLines) {
      const { data: v } = await svc.from("product_variants").select("reserved").eq("id", line.variantId).single();
      const reserved = v?.reserved ?? 0;
      const { error: rvErr } = await svc
        .from("product_variants")
        .update({ reserved: reserved + line.qty })
        .eq("id", line.variantId);
      if (rvErr) {
        await svc.from("orders").delete().eq("id", order.id);
        return Response.json({ success: false, error: "Gagal mengunci stok." }, { status: 500 });
      }
    }

    if (cartId) {
      const { error: delCartErr } = await svc
        .from("cart_items")
        .delete()
        .in("id", orderLines.map((l) => l.lineId));
      if (delCartErr) {
        for (const line of orderLines) {
          const { data: v } = await svc.from("product_variants").select("reserved").eq("id", line.variantId).single();
          const reserved = Math.max(0, (v?.reserved ?? 0) - line.qty);
          await svc.from("product_variants").update({ reserved }).eq("id", line.variantId);
        }
        await svc.from("orders").delete().eq("id", order.id);
        return Response.json({ success: false, error: "Gagal menghapus item dari keranjang." }, { status: 500 });
      }
    }

    if (couponId) {
      const { error: cuErr } = await svc.from("coupon_usages").insert({
        coupon_id: couponId,
        user_id: user.id,
        order_id: order.id,
      });
      if (cuErr) {
        if (cartId) {
          await svc.from("cart_items").insert(
            orderLines.map((l) => ({ cart_id: cartId, variant_id: l.variantId, quantity: l.qty })),
          );
        }
        for (const line of orderLines) {
          const { data: v } = await svc.from("product_variants").select("reserved").eq("id", line.variantId).single();
          const reserved = Math.max(0, (v?.reserved ?? 0) - line.qty);
          await svc.from("product_variants").update({ reserved }).eq("id", line.variantId);
        }
        await svc.from("orders").delete().eq("id", order.id);
        return Response.json({ success: false, error: "Gagal mencatat pemakaian kupon." }, { status: 500 });
      }

      const { data: cRow } = await svc.from("coupons").select("used_count").eq("id", couponId).single();
      const nextUsed = (cRow?.used_count ?? 0) + 1;
      const { error: bumpErr } = await svc.from("coupons").update({ used_count: nextUsed }).eq("id", couponId);
      if (bumpErr) {
        await svc.from("coupon_usages").delete().eq("order_id", order.id);
        if (cartId) {
          await svc.from("cart_items").insert(
            orderLines.map((l) => ({ cart_id: cartId, variant_id: l.variantId, quantity: l.qty })),
          );
        }
        for (const line of orderLines) {
          const { data: v } = await svc.from("product_variants").select("reserved").eq("id", line.variantId).single();
          const reserved = Math.max(0, (v?.reserved ?? 0) - line.qty);
          await svc.from("product_variants").update({ reserved }).eq("id", line.variantId);
        }
        await svc.from("orders").delete().eq("id", order.id);
        return Response.json({ success: false, error: "Gagal memperbarui kupon." }, { status: 500 });
      }
    }

    await createNotification({
      userId: user.id,
      title: "Pesanan Berhasil Dibuat",
      body: `Pesanan ${order.order_number} telah kami terima. Selesaikan pembayaran sebelum kedaluwarsa.`,
      type: "order_placed",
      data: { orderId: order.id, orderNumber: order.order_number },
    });

    await createAdminNotification({
      title: "Pesanan Baru Masuk",
      body: `Pesanan ${order.order_number} dari ${address.recipient} senilai Rp${total.toLocaleString("id-ID")}.`,
      type: "new_order",
      data: { orderId: order.id, orderNumber: order.order_number },
    });

    if (user.email) {
      sendOrderConfirmation({
        to: user.email,
        name: address.recipient,
        orderNumber: order.order_number,
        orderId: order.id,
        items: orderLines.map((l) => ({
          name: l.productName,
          variantName: l.variantName,
          qty: l.qty,
          unitPrice: Math.round(l.unitPrice),
        })),
        subtotal: subtotalRounded,
        discount: discountAmount,
        shipping: shippingCost,
        fee: APP_SERVICE_FEE,
        total,
        courierName: ship.courierName,
        serviceName: ship.serviceName,
        etd: ship.etd,
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        snapToken,
        clientKey: clientKey ?? null,
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
      },
    });
  } catch {
    if (createdOrderId) {
      try {
        const svc = createServiceClient();
        await svc.from("orders").delete().eq("id", createdOrderId);
      } catch {
        // ignore
      }
    }
    return Response.json({ success: false, error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
