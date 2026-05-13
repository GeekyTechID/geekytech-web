import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { OrderComplaintForm } from "@/components/dashboard/order-complaint-form";

export default async function OrderComplaintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/orders/${id}/complaint`);

  const detail = await fetchOrderDetailForUser(user.id, id);
  if (!detail) notFound();

  return (
    <div>
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
        Jelaskan masalah secara jujur. Tim GeekyTech akan menghubungi Anda melalui kontak akun bila diperlukan.
      </div>
      <OrderComplaintForm orderId={detail.order.id} />
    </div>
  );
}
