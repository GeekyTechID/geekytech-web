import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { ComplaintDetailView, type ComplaintDetail } from "./_components/complaint-detail";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Komplain #${id.slice(0, 8)} — Admin GeekyTech` };
}

export default async function AdminComplaintDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: complaint } = await supabase
    .from("complaints")
    .select(
      `id, type, reason, description, status, admin_note, images, created_at, resolved_at,
       orders:order_id (id, order_number),
       profiles:user_id (full_name, phone)`
    )
    .eq("id", id)
    .single();

  if (!complaint) notFound();

  return <ComplaintDetailView complaint={complaint as ComplaintDetail} />;
}
