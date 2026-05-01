"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Valid next statuses for each current status
export const VALID_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["completed"],
};

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<{ error?: string }> {
  if (!(ORDER_STATUSES as readonly string[]).includes(newStatus)) {
    return { error: "Status tidak valid." };
  }

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (error) return { error: error.message };

  const { error: historyError } = await supabase
    .from("order_status_history")
    .insert({
      order_id: orderId,
      status: newStatus,
      note: note?.trim() || null,
      changed_by: null,
    });

  if (historyError) console.error("history log failed:", historyError.message);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}

export async function updateOrderAWB(
  orderId: string,
  awb: string
): Promise<{ error?: string }> {
  const trimmed = awb.trim();
  if (!trimmed) return { error: "Nomor AWB tidak boleh kosong." };

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("shipments")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("shipments")
      .update({ awb: trimmed })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { data: order } = await supabase
      .from("orders")
      .select("courier_company, courier_service")
      .eq("id", orderId)
      .single();

    const { error } = await supabase.from("shipments").insert({
      order_id: orderId,
      awb: trimmed,
      courier_company: order?.courier_company ?? "manual",
      courier_service: order?.courier_service ?? "manual",
      status: "confirmed",
    });
    if (error) return { error: error.message };
  }

  // Auto-advance to shipped if still processing
  const { data: orderData } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (orderData?.status === "processing") {
    await supabase
      .from("orders")
      .update({ status: "shipped" })
      .eq("id", orderId);
    await supabase.from("order_status_history").insert({
      order_id: orderId,
      status: "shipped",
      note: `AWB diinput manual: ${trimmed}`,
      changed_by: null,
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}
