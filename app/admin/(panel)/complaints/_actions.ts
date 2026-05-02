"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

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
