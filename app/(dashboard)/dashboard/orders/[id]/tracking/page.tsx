import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";

import { Button } from "@/components/ui/button";

import { createClient } from "@/lib/supabase/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { fetchBiteshipTracking } from "@/lib/biteship/fetch-tracking";
import { formatDate } from "@/lib/format";

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

  // Live-fetch tracking for each shipment that has AWB
  const trackingResults = await Promise.all(
    shipments.map(async (s) => {
      if (!s.awb) return { shipment: s, result: null };
      const result = await fetchBiteshipTracking(s.awb, s.courier_company);
      return { shipment: s, result };
    }),
  );

  return (
    <div>
      <Link
        href={`/dashboard/orders/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#EA5329] hover:underline"
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

        {shipments.length === 0 ? (
          <p className="mt-6 text-sm text-[#5c5c5c]">
            Belum ada resi pengiriman — tim kami akan memperbarui setelah paket dikirim.
          </p>
        ) : (
          <div className="mt-8 space-y-10">
            {trackingResults.map(({ shipment: s, result }) => (
              <div key={s.id} className="border-t border-[#f0f0f0] pt-8 first:border-t-0 first:pt-0">
                {/* Shipment header */}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#1d1d1f]">
                      {s.courier_company} · {s.courier_service}
                    </p>
                    {s.awb ? (
                      <p className="mt-0.5 font-mono text-sm text-[#5c5c5c]">AWB: {s.awb}</p>
                    ) : (
                      <p className="mt-0.5 text-sm text-[#7a7a7a]">Nomor resi belum tersedia</p>
                    )}
                  </div>
                  {result?.ok && result.link ? (
                    <Button asChild variant="secondary" size="sm" className="mt-2 sm:mt-0">
                      <a href={result.link} target="_blank" rel="noopener noreferrer">
                        Lacak di situs kurir ↗
                      </a>
                    </Button>
                  ) : null}
                </div>

                {/* Live status badge */}
                {result?.ok ? (
                  <div className="mt-3">
                    <span className="inline-block rounded-full bg-[#EA5329]/10 px-3 py-1 text-xs font-semibold text-[#EA5329]">
                      {result.status || s.status}
                    </span>
                  </div>
                ) : null}

                {/* No AWB */}
                {!s.awb ? (
                  <p className="mt-4 text-sm text-[#5c5c5c]">
                    Nomor resi belum diisi. Pantau terus halaman ini.
                  </p>
                ) : result === null ? (
                  <p className="mt-4 text-sm text-[#5c5c5c]">Memuat data tracking…</p>
                ) : !result.ok ? (
                  <p className="mt-4 text-sm text-[#7a7a7a]">{result.error}</p>
                ) : result.steps.length === 0 ? (
                  <p className="mt-4 text-sm text-[#5c5c5c]">
                    Belum ada riwayat perjalanan paket.
                  </p>
                ) : (
                  <ol className="relative mt-6 border-l-2 border-[#e0e0e0] pl-5 space-y-5">
                    {result.steps.map((step, i) => (
                      <li key={i} className="relative">
                        <span
                          className={`absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full border-2 border-white ${i === 0 ? "bg-[#EA5329]" : "bg-[#d2d2d7]"}`}
                          aria-hidden
                        />
                        <p className={`text-sm font-medium ${i === 0 ? "text-[#1d1d1f]" : "text-[#5c5c5c]"}`}>
                          {step.description || step.status}
                        </p>
                        {step.at ? (
                          <p className="mt-0.5 text-xs text-[#7a7a7a]">
                            {formatDate(step.at, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
