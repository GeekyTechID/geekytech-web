"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create-notification";
import { createBiteshipOrder } from "@/lib/biteship/create-order";

export const COMPLAINT_STATUSES = [
  "open",
  "in_review",
  "resolved",
  "rejected",
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export async function updateComplaintStatus(
  complaintId: string,
  newStatus: ComplaintStatus,
  adminNote?: string
): Promise<{ error?: string }> {
  if (!(COMPLAINT_STATUSES as readonly string[]).includes(newStatus)) {
    return { error: "Status tidak valid." };
  }

  const supabase = await createServiceClient();

  const resolvedAt =
    newStatus === "resolved" || newStatus === "rejected"
      ? new Date().toISOString()
      : undefined;

  const { error } = await supabase
    .from("complaints")
    .update({
      status: newStatus,
      admin_note: adminNote?.trim() || null,
      ...(resolvedAt ? { resolved_at: resolvedAt } : {}),
    })
    .eq("id", complaintId);

  if (error) return { error: error.message };

  revalidatePath("/admin/complaints");
  revalidatePath(`/admin/complaints/${complaintId}`);
  return {};
}

export async function updateAdminNote(
  complaintId: string,
  adminNote: string
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("complaints")
    .update({ admin_note: adminNote.trim() || null })
    .eq("id", complaintId);

  if (error) return { error: error.message };

  revalidatePath("/admin/complaints");
  revalidatePath(`/admin/complaints/${complaintId}`);
  return {};
}

export async function sendAdminComplaintMessage(
  complaintId: string,
  message: string,
): Promise<{ error?: string }> {
  const { createClient: createAuthClient } = await import("@/lib/supabase/server");
  const authClient = await createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi." };

  const supabase = await createServiceClient();
  const { error } = await supabase.from("complaint_messages").insert({
    complaint_id: complaintId,
    sender_id: user.id,
    sender_role: "admin",
    message: message.trim(),
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/complaints/${complaintId}`);
  return {};
}

export async function approveReturn(
  complaintId: string,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { data: complaint } = await supabase
    .from("complaints")
    .select("id, order_id, user_id, status")
    .eq("id", complaintId)
    .single();

  if (!complaint) return { error: "Komplain tidak ditemukan." };
  if (complaint.status !== "in_review")
    return { error: "Status harus 'Ditinjau' untuk approve retur." };

  // Idempotency: skip if return already exists
  const { data: existing } = await supabase
    .from("returns")
    .select("id")
    .eq("complaint_id", complaintId)
    .maybeSingle();

  if (!existing) {
    const { error: retErr } = await supabase.from("returns").insert({
      complaint_id: complaintId,
      order_id: complaint.order_id,
      user_id: complaint.user_id,
      status: "pending_shipback",
    });
    if (retErr) return { error: retErr.message };
  }

  const { error } = await supabase
    .from("complaints")
    .update({ status: "return_approved" })
    .eq("id", complaintId);
  if (error) return { error: error.message };

  await createNotification({
    userId: complaint.user_id as string,
    title: "Retur Disetujui",
    body: "Pengajuan retur Anda telah disetujui. Silakan kirim barang ke GeekyTech.",
    type: "order_update",
    data: { complaint_id: complaintId },
  });

  revalidatePath(`/admin/complaints/${complaintId}`);
  revalidatePath("/admin/complaints");
  return {};
}

export async function confirmReturnReceived(
  returnId: string,
  complaintId: string,
): Promise<{ error?: string }> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("returns")
    .update({ status: "received", updated_at: new Date().toISOString() })
    .eq("id", returnId)
    .eq("status", "shipped_back");

  if (error) return { error: error.message };

  revalidatePath(`/admin/complaints/${complaintId}`);
  return {};
}

export async function createReplacementShipment(input: {
  returnId: string;
  complaintId: string;
  orderId: string;
  items: { name: string; value: number; quantity: number; weight: number }[];
  destinationName: string;
  destinationPhone: string;
  destinationAddress: string;
  destinationPostalCode: number;
  courierCompany: string;
  courierType: string;
  userId: string;
}): Promise<{ error?: string }> {
  const result = await createBiteshipOrder({
    destinationName: input.destinationName,
    destinationPhone: input.destinationPhone,
    destinationAddress: input.destinationAddress,
    destinationPostalCode: input.destinationPostalCode,
    courierCompany: input.courierCompany,
    courierType: input.courierType,
    items: input.items,
    orderNote: "Penggantian produk retur",
  });

  if (!result.ok) return { error: result.error };

  const supabase = await createServiceClient();

  const { error: shipErr } = await supabase.from("return_shipments").insert({
    return_id: input.returnId,
    biteship_order_id: result.biteshipOrderId,
    awb_number: result.awb,
    courier: result.courierName ?? input.courierCompany,
    status: result.status,
  });
  if (shipErr) return { error: shipErr.message };

  await supabase
    .from("returns")
    .update({ status: "replacement_sent", updated_at: new Date().toISOString() })
    .eq("id", input.returnId);

  await createNotification({
    userId: input.userId,
    title: "Produk Pengganti Dikirim",
    body: `Produk pengganti untuk komplain Anda sedang dalam perjalanan${result.awb ? ` (resi: ${result.awb})` : ""}.`,
    type: "order_update",
    data: { complaint_id: input.complaintId, awb: result.awb },
  });

  revalidatePath(`/admin/complaints/${input.complaintId}`);
  revalidatePath("/admin/returns");
  return {};
}
