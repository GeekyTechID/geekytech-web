"use server";

import { createClient } from "@/lib/supabase/server";

export type ComplaintMessage = {
  id: string;
  sender_id: string;
  sender_role: "user" | "admin";
  message: string;
  created_at: string;
};

export type ReturnDetail = {
  id: string;
  status: string;
  return_awb: string | null;
  return_courier: string | null;
  created_at: string;
  return_shipments: {
    id: string;
    awb_number: string | null;
    courier: string | null;
    status: string | null;
  }[];
};

export type ComplaintWithThread = {
  id: string;
  category: string;
  reason: string;
  description: string | null;
  status: string;
  images: string[];
  created_at: string;
  messages: ComplaintMessage[];
  return: ReturnDetail | null;
};

/** Fetch complaint + messages + return for a given order (user-scoped via RLS). */
export async function fetchComplaintForOrder(
  orderId: string,
): Promise<ComplaintWithThread | null> {
  const supabase = await createClient();

  const { data: complaint } = await supabase
    .from("complaints")
    .select("id, category, reason, description, status, images, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!complaint) return null;

  const [msgRes, returnRes] = await Promise.all([
    supabase
      .from("complaint_messages")
      .select("id, sender_id, sender_role, message, created_at")
      .eq("complaint_id", complaint.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("returns")
      .select("id, status, return_awb, return_courier, created_at, return_shipments(id, awb_number, courier, status)")
      .eq("complaint_id", complaint.id)
      .maybeSingle(),
  ]);

  return {
    ...complaint,
    images: Array.isArray(complaint.images) ? (complaint.images as string[]) : [],
    messages: (msgRes.data ?? []) as ComplaintMessage[],
    return: returnRes.data
      ? {
          ...returnRes.data,
          return_shipments: Array.isArray((returnRes.data as any).return_shipments)
            ? (returnRes.data as any).return_shipments
            : [],
        }
      : null,
  };
}
