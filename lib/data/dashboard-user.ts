import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

import type { OrderStatus } from "@/lib/constants/order-status-labels";

export type DashboardOrderRow = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  "id" | "order_number" | "status" | "total" | "created_at"
>;

type OrderItemQueryRow = Database["public"]["Tables"]["order_items"]["Row"] & {
  product_variants:
    | {
        product_id: string;
        products: { slug: string } | { slug: string }[] | null;
      }
    | {
        product_id: string;
        products: { slug: string } | { slug: string }[] | null;
      }[]
    | null;
};

export type DashboardOrderItemRow = Database["public"]["Tables"]["order_items"]["Row"] & {
  product_id: string | null;
  product_slug: string | null;
};

function mapOrderItemRow(row: OrderItemQueryRow): DashboardOrderItemRow {
  const { product_variants: pvRaw, ...base } = row;
  const pv = Array.isArray(pvRaw) ? pvRaw[0] : pvRaw;
  const prodRaw = pv?.products ?? null;
  const prod = Array.isArray(prodRaw) ? prodRaw[0] : prodRaw;
  return {
    ...base,
    product_id: pv?.product_id ?? null,
    product_slug: prod?.slug ?? null,
  };
}

export type DashboardOrderDetail = {
  order: Database["public"]["Tables"]["orders"]["Row"];
  items: DashboardOrderItemRow[];
  payments: Database["public"]["Tables"]["payments"]["Row"][];
  shipments: Database["public"]["Tables"]["shipments"]["Row"][];
};

export type DashboardOverview = {
  orderCount: number;
  unreadNotifications: number;
  wishlistCount: number;
};

export type WishlistItemRow = {
  wishlistId: string;
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
};

export type ProblemPaymentRow = {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  status: Database["public"]["Enums"]["payment_status"];
  gross_amount: number;
  created_at: string;
};

export async function fetchDashboardOverview(userId: string): Promise<DashboardOverview> {
  try {
    const supabase = await createClient();
    const [ordersRes, notifRes, wishRes] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
      supabase.from("wishlists").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    return {
      orderCount: ordersRes.count ?? 0,
      unreadNotifications: notifRes.count ?? 0,
      wishlistCount: wishRes.count ?? 0,
    };
  } catch {
    return { orderCount: 0, unreadNotifications: 0, wishlistCount: 0 };
  }
}

export async function fetchUserOrders(
  userId: string,
  statusFilter: OrderStatus | "" | null,
): Promise<DashboardOrderRow[]> {
  try {
    const supabase = await createClient();
    let q = supabase
      .from("orders")
      .select("id, order_number, status, total, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (statusFilter && statusFilter.length > 0) {
      q = q.eq("status", statusFilter);
    }
    const { data, error } = await q;
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export const fetchOrderDetailForUser = cache(async (userId: string, orderId: string): Promise<DashboardOrderDetail | null> => {
  try {
    const supabase = await createClient();
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();
    if (oErr || !order) return null;

    const [itemsRes, payRes, shipRes] = await Promise.all([
      supabase
        .from("order_items")
        .select(
          `
          *,
          product_variants (
            product_id,
            products ( slug )
          )
        `,
        )
        .eq("order_id", orderId)
        .order("id", { ascending: true }),
      supabase.from("payments").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
      supabase.from("shipments").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
    ]);

    const rawItems = (itemsRes.data ?? []) as OrderItemQueryRow[];
    const items = rawItems.map(mapOrderItemRow);

    return {
      order,
      items,
      payments: payRes.data ?? [],
      shipments: shipRes.data ?? [],
    };
  } catch {
    return null;
  }
});

export async function fetchWishlistForUser(userId: string): Promise<WishlistItemRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wishlists")
      .select("id, product_id, products(id, name, slug, product_images(url, is_primary, sort_order))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data?.length) return [];

    type Img = { url: string; is_primary: boolean | null; sort_order: number | null };
    type P = { id: string; name: string; slug: string; product_images: Img[] | null };
    type Row = { id: string; product_id: string; products: P | P[] | null };

    const out: WishlistItemRow[] = [];
    for (const row of data as unknown as Row[]) {
      const p = Array.isArray(row.products) ? row.products[0] : row.products;
      if (!p?.slug) continue;
      const imgs = p.product_images ?? [];
      const primary =
        imgs.find((i) => i.is_primary) ?? [...imgs].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
      out.push({
        wishlistId: row.id,
        productId: p.id,
        name: p.name,
        slug: p.slug,
        imageUrl: primary?.url ?? null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchUserNotifications(userId: string, limit: number) {
  const cap = Math.min(Math.max(limit, 1), 100);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, type, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(cap);
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export type CouponPublicRow = Pick<
  Database["public"]["Tables"]["coupons"]["Row"],
  "id" | "code" | "type" | "value" | "min_purchase" | "max_discount" | "valid_from" | "valid_until" | "used_count" | "max_usage"
>;

export async function fetchActiveCouponsForStore(): Promise<CouponPublicRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("coupons")
      .select("id, code, type, value, min_purchase, max_discount, valid_from, valid_until, used_count, max_usage")
      .eq("is_active", true)
      .order("code", { ascending: true })
      .limit(50);
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function fetchUserProfile(userId: string): Promise<Database["public"]["Tables"]["profiles"]["Row"] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchUserAddresses(userId: string): Promise<Database["public"]["Tables"]["addresses"]["Row"][]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function fetchAddressForUser(
  userId: string,
  addressId: string,
): Promise<Database["public"]["Tables"]["addresses"]["Row"] | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", addressId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchProblemPaymentsForUser(userId: string, limit = 12): Promise<ProblemPaymentRow[]> {
  const cap = Math.min(Math.max(limit, 1), 50);
  try {
    const supabase = await createClient();
    const { data: orders, error: oErr } = await supabase.from("orders").select("id, order_number").eq("user_id", userId);
    if (oErr || !orders?.length) return [];
    const orderIds = orders.map((o) => o.id);
    const numMap = new Map(orders.map((o) => [o.id, o.order_number]));
    const { data: pays, error: pErr } = await supabase
      .from("payments")
      .select("id, order_id, status, gross_amount, created_at")
      .in("order_id", orderIds)
      .in("status", ["failed", "expired", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(cap);
    if (pErr || !pays?.length) return [];
    return pays.map((p) => ({
      paymentId: p.id,
      orderId: p.order_id,
      orderNumber: numMap.get(p.order_id) ?? "",
      status: p.status,
      gross_amount: p.gross_amount,
      created_at: p.created_at,
    }));
  } catch {
    return [];
  }
}

export async function fetchReviewedProductIdsForOrder(userId: string, orderId: string): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("product_reviews")
      .select("product_id")
      .eq("order_id", orderId)
      .eq("user_id", userId);
    if (error || !data) return [];
    return data.map((r) => r.product_id);
  } catch {
    return [];
  }
}
