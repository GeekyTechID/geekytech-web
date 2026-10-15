import { Package, Truck } from "lucide-react";

import type { TrackingResult } from "@/lib/biteship/fetch-tracking";
import {
  FALLBACK_CFG,
  SHIPMENT_STATUS_LABEL,
  STEP_CFG,
  TrackingTimeline,
  formatTrackingTime,
} from "@/components/dashboard/shipment-tracking-timeline";

export { STEP_CFG, FALLBACK_CFG, TrackingTimeline };

interface ShipmentHeaderProps {
  courierName?: string | null;
  courierCompany?: string | null;
  courierService?: string | null;
  awb: string;
  externalLink?: string | null;
  status: string;
  updatedAt?: string | null;
}

export function ShipmentTrackingCard({
  courierName,
  courierCompany,
  courierService,
  awb,
  status,
  updatedAt,
  trackingResult,
}: ShipmentHeaderProps & { trackingResult: TrackingResult }) {
  const hasSteps = trackingResult.ok && trackingResult.steps.length > 0;
  const cfg = STEP_CFG[status];

  return (
    <div>
      {/* Courier + AWB header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF0E8]">
            <Truck className="h-4 w-4 text-[#EA5329]" />
          </div>
          <div>
            <p className="text-[14px] font-semibold leading-snug text-[#1d1d1f]">
              {courierName ?? courierCompany?.toUpperCase()}
              {courierService ? ` · ${courierService}` : ""}
            </p>
            <p className="mt-0.5 select-all font-mono text-[12px] text-[#7a7a7a]">{awb}</p>
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold",
            cfg ? `${cfg.bg} ${cfg.color}` : "bg-[#f5f5f7] text-[#5c5c5c]",
          ].join(" ")}
        >
          {cfg && (() => { const { Icon: StatusIcon } = cfg; return <StatusIcon className="h-3 w-3" strokeWidth={2.5} />; })()}
          {SHIPMENT_STATUS_LABEL[status] ?? status}
        </span>
        {updatedAt && (
          <span className="text-[12px] text-[#a0a0a0]">· {formatTrackingTime(updatedAt)}</span>
        )}
      </div>

      {/* Timeline */}
      {hasSteps ? (
        <div className="mt-4 rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-4 sm:p-5">
          <TrackingTimeline result={trackingResult} />
        </div>
      ) : (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#f5f5f7] px-4 py-3">
          <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b0b0b0]" />
          <p className="text-[12px] leading-relaxed text-[#a0a0a0]">
            Riwayat dari kurir belum tersedia. Coba cek langsung di website kurir.
          </p>
        </div>
      )}
    </div>
  );
}
