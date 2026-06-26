"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";

const updateCustomerSchema = z.object({
  full_name: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().min(1, "Nama minimal 1 karakter").max(100, "Nama max 100 karakter").nullable(),
  ),
  phone: z.preprocess(
    (v) => (v === "" ? null : v),
    z
      .string()
      .regex(/^[0-9+\-\s()]{6,20}$/, "Format nomor HP tidak valid")
      .nullable(),
  ),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export async function updateCustomer(
  id: string,
  data: UpdateCustomerInput,
): Promise<{ error?: string }> {
  const parsed = updateCustomerSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  return {};
}

export async function deleteCustomer(id: string): Promise<{ error?: string }> {
  const supabase = createServiceClient();

  // Soft delete — pelanggan tidak muncul di daftar tapi data tetap ada
  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .neq("role", "admin"); // guard: jangan bisa hapus admin

  if (error) return { error: error.message };

  revalidatePath("/admin/customers");
  return {};
}
