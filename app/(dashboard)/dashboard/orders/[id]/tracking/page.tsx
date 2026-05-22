import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/orders/${id}/tracking`);

  const detail = await fetchOrderDetailForUser(user.id, id);
  if (!detail) notFound();

  const { order, shipments } = detail;
  const shipmentsWithAwb = shipments.filter((s) => s.awb);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/dashboard/orders/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#EA5329] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke detail pesanan
      </Link>

      <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Package className="mt-0.5 h-5 w-5 shrink-0 text-[#EA5329]" />
          <div>
            <h2 className="text-lg font-bold text-[#1d1d1f]">Lacak pengiriman</h2>
            <p className="mt-0.5 text-sm text-[#5c5c5c]">Pesanan {order.order_number}</p>
          </div>
        </div>

        {shipments.length === 0 || shipmentsWithAwb.length === 0 ? (
          <p className="mt-6 text-sm text-[#5c5c5c]">
            Nomor resi belum tersedia — tim kami akan memperbarui setelah paket dikirim.
          </p>
        ) : (
          <div className="mt-6 space-y-8">
            {shipmentsWithAwb.map((s) => (
              <div key={s.id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#1d1d1f]">
                      {s.courier_company?.toUpperCase()} · {s.courier_service}
                    </p>
                    <p className="mt-0.5 font-mono text-sm text-[#5c5c5c]">AWB: {s.awb}</p>
                  </div>
                  <a
                    href={`https://track.biteship.com/${s.awb}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[#EA5329] hover:underline"
                  >
                    Buka di tab baru ↗
                  </a>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#e0e0e0]">
                  <iframe
                    src={`https://track.biteship.com/${s.awb}`}
                    title={`Lacak resi ${s.awb}`}
                    className="h-[600px] w-full"
                    loading="lazy"
                    allow="clipboard-read; clipboard-write"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
