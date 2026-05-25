"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export async function deleteReview(reviewId: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("product_reviews")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", reviewId);

  if (error) return { error: error.message };
  revalidatePath("/admin/reviews");
  return {};
}
