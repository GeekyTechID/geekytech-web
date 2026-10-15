export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { Info, Package, Truck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { nowMs } from "@/lib/utils";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { fetchBiteshipTracking, trackingStepsFromHistory, type TrackingResult } from "@/lib/biteship/fetch-tracking";
import { OrderStatusStepper } from "@/components/dashboard/order-status-stepper";
import {
  SHIPMENT_STATUS_LABEL,
  STEP_CFG,
  TrackingTimeline,
  formatTrackingTime,
} from "@/components/dashboard/shipment-tracking-timeline";

// ─── Page ──────────────────────────────────────────────────────────────────

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

  const { order, shipments, statusHistory } = detail;
  const shipmentsWithAwb = shipments.filter((s) => s.awb);

  const trackingResults = await Promise.all(
    shipmentsWithAwb.map(async (s): Promise<TrackingResult> => {
      // Primary: timeline dari DB (diisi webhook Biteship) — selalu tersedia,
      // jalan juga utk kurir instant (gojek/grab) & test mode.
      const dbSteps = trackingStepsFromHistory(s.tracking_history);
      if (dbSteps.length > 0) {
        return { ok: true, waybillId: s.awb!, status: dbSteps[0]?.status ?? "", steps: dbSteps, link: null };
      }
      // Fallback: tracking live by-waybill (kurir reguler di produksi).
      return fetchBiteshipTracking(s.awb!, s.courier_company ?? "");
    }),
  );

  const deliveredAt = order.delivered_at ? new Date(order.delivered_at) : null;
  const deadlineMs = deliveredAt ? deliveredAt.getTime() + 3 * 24 * 60 * 60 * 1000 : null;
  const now = nowMs();
  const canComplain = order.status === "delivered" && deadlineMs !== null && now < deadlineMs;
  const hoursLeft = deadlineMs ? Math.max(0, Math.ceil((deadlineMs - now) / (1000 * 60 * 60))) : 0;

  return (
    <>
    {canComplain && (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-[13px] leading-relaxed text-amber-900">
          Ada masalah dengan pesanan? Anda memiliki{" "}
          <span className="font-semibold">{hoursLeft} jam</span> lagi untuk{" "}
          <a href={`/dashboard/orders/${order.id}/complaint`} className="underline underline-offset-2">
            mengajukan komplain
          </a>
          .
        </p>
      </div>
    )}
    {order.status === "completed" && (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#e0e0e0] bg-[#f5f5f7] px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#a0a0a0]" />
        <p className="text-[13px] text-[#7a7a7a]">
          Batas waktu komplain untuk pesanan ini telah berakhir.
        </p>
      </div>
    )}
    {/* items-stretch: kartu Status Pesanan setinggi kartu Lacak Kiriman (tanpa ruang kosong) */}
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 lg:items-stretch">
      {/* ── Status Pesanan ── */}
      <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-5 sm:p-6">
        <p className="mb-5 text-[11px] font-bold uppercase tracking-widest text-[#a0a0a0]">
          Status Pesanan
        </p>
        <OrderStatusStepper currentStatus={order.status} statusHistory={statusHistory} />
      </div>

      {/* ── Lacak Kiriman ── */}
      <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E8]">
            <Package className="h-5 w-5 text-[#EA5329]" />
          </div>
          <div>
            <h2 className="text-[17px] font-semibold leading-snug tracking-tight text-[#1d1d1f]">
              Lacak Kiriman
            </h2>
            <p className="mt-0.5 text-[13px] text-[#7a7a7a]">
              Pesanan {order.order_number}
            </p>
          </div>
        </div>

        {shipmentsWithAwb.length === 0 ? (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-[#f5f5f7] px-4 py-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#a0a0a0]" />
            <p className="text-[13px] leading-relaxed text-[#7a7a7a]">
              Nomor resi belum tersedia — tim kami akan memperbarui setelah paket dikirim.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {shipmentsWithAwb.map((s, i) => {
              const tracking = trackingResults[i];
              const hasSteps = tracking?.ok && tracking.steps.length > 0;
              const cfg = STEP_CFG[s.status];

              return (
                <div key={s.id}>
                  {/* Courier + AWB header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF0E8]">
                        <Truck className="h-4 w-4 text-[#EA5329]" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold leading-snug text-[#1d1d1f]">
                          {s.courier_name ?? s.courier_company?.toUpperCase()}
                          {s.courier_service ? ` · ${s.courier_service}` : ""}
                        </p>
                        <p className="mt-0.5 select-all font-mono text-[12px] text-[#7a7a7a]">
                          {s.awb}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Current status badge */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold",
                        cfg ? `${cfg.bg} ${cfg.color}` : "bg-[#f5f5f7] text-[#5c5c5c]",
                      ].join(" ")}
                    >
                      {cfg && <cfg.Icon className="h-3 w-3" strokeWidth={2.5} />}
                      {SHIPMENT_STATUS_LABEL[s.status] ?? s.status}
                    </span>
                    {s.updated_at && (
                      <span className="text-[12px] text-[#a0a0a0]">
                        · {formatTrackingTime(s.updated_at)}
                      </span>
                    )}
                  </div>

                  {/* Timeline */}
                  {hasSteps ? (
                    <div className="mt-4 rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-4 sm:p-5">
                      <TrackingTimeline result={tracking} />
                    </div>
                  ) : (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#f5f5f7] px-4 py-3">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b0b0b0]" />
                      <p className="text-[12px] leading-relaxed text-[#a0a0a0]">
                        Riwayat dari kurir belum tersedia. Coba cek langsung di website kurir.
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
    </>
  );
}
