export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Truck, Info } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { fetchBiteshipTracking, type TrackingResult } from "@/lib/biteship/fetch-tracking";
import type { Database } from "@/types/supabase";

type ShipmentStatus = Database["public"]["Enums"]["shipment_status"];

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: "Menunggu Konfirmasi",
  confirmed: "Pesanan Dikonfirmasi",
  allocated: "Kurir Dialokasikan",
  picking_up: "Penjemputan",
  picked: "Paket Diambil",
  dropping_off: "Dalam Pengantaran",
  delivered: "Paket Diterima",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
  returned: "Diretur",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TrackingTimeline({ result }: { result: TrackingResult }) {
  if (!result.ok || result.steps.length === 0) return null;

  // Biteship returns newest-first → reverse to oldest-first (chronological, top → bottom)
  const steps = [...result.steps].reverse();
  const lastIdx = steps.length - 1;

  return (
    <div>
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-[#a0a0a0]">
        Riwayat Pengiriman
      </p>
      <div>
        {steps.map((step, i) => {
          const isCurrent = i === lastIdx;
          const isLast = i === lastIdx;
          return (
            <div key={i} className="flex gap-4">
              {/* dot + connector */}
              <div className="flex flex-col items-center">
                <div
                  className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${
                    isCurrent ? "bg-[#EA5329]" : "border border-[#d0d0d0] bg-white"
                  }`}
                >
                  {isCurrent && (
                    <div className="h-[7px] w-[7px] rounded-full bg-white" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className="my-1 w-px flex-1 bg-[#e0e0e0]"
                    style={{ minHeight: 20 }}
                  />
                )}
              </div>
              {/* content */}
              <div className={`min-w-0 ${isLast ? "pb-0" : "pb-5"}`}>
                <p
                  className={`text-sm leading-snug tracking-[-0.224px] ${
                    isCurrent
                      ? "font-semibold text-[#1d1d1f]"
                      : "font-normal text-[#7a7a7a]"
                  }`}
                >
                  {step.description || step.status}
                </p>
                {step.at && (
                  <p className="mt-0.5 text-xs text-[#a0a0a0]">
                    {formatDate(step.at)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const trackingResults = await Promise.all(
    shipmentsWithAwb.map((s) =>
      fetchBiteshipTracking(s.awb!, s.courier_company ?? ""),
    ),
  );

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/dashboard/orders/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#EA5329] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke detail pesanan
      </Link>

      <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Package className="mt-0.5 h-5 w-5 shrink-0 text-[#EA5329]" />
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.374px] text-[#1d1d1f]">
              Lacak Kiriman
            </h2>
            <p className="mt-0.5 text-sm text-[#7a7a7a]">
              Pesanan {order.order_number}
            </p>
          </div>
        </div>

        {shipmentsWithAwb.length === 0 ? (
          <div className="mt-6 flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#a0a0a0]" />
            <p className="text-sm text-[#7a7a7a]">
              Nomor resi belum tersedia — tim kami akan memperbarui setelah paket dikirim.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {shipmentsWithAwb.map((s, i) => {
              const tracking = trackingResults[i];
              const hasSteps = tracking?.ok && tracking.steps.length > 0;
              const externalLink = tracking?.ok ? tracking.link : null;
              const dbStatus = s.status as ShipmentStatus;

              return (
                <div key={s.id}>
                  {/* courier + AWB header */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 shrink-0 text-[#EA5329]" />
                      <div>
                        <p className="font-semibold tracking-[-0.374px] text-[#1d1d1f]">
                          {s.courier_name ?? s.courier_company?.toUpperCase()} ·{" "}
                          {s.courier_service}
                        </p>
                        <p className="mt-0.5 font-mono text-sm text-[#7a7a7a]">
                          AWB: {s.awb}
                        </p>
                      </div>
                    </div>
                    <a
                      href={externalLink ?? `https://track.biteship.com/${s.awb}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#EA5329] hover:underline"
                    >
                      Lacak di website kurir ↗
                    </a>
                  </div>

                  {/* current status badge */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-block rounded-full bg-[#EA5329]/10 px-3 py-1 text-xs font-semibold text-[#EA5329]">
                      {STATUS_LABEL[dbStatus] ?? dbStatus}
                    </span>
                    {s.updated_at && (
                      <span className="text-xs text-[#a0a0a0]">
                        · diperbarui {formatDate(s.updated_at)}
                      </span>
                    )}
                  </div>

                  {/* tracking history */}
                  {hasSteps ? (
                    <div className="mt-4 rounded-[18px] border border-[#e0e0e0] bg-[#f5f5f7] p-5">
                      <TrackingTimeline result={tracking} />
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 shrink-0 text-[#a0a0a0]" />
                      <p className="text-xs text-[#a0a0a0]">
                        Riwayat dari kurir belum tersedia.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
