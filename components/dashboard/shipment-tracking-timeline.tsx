import {
  Camera,
  CheckCircle2,
  Circle,
  Home,
  MapPin,
  PackageCheck,
  RotateCcw,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";

import type { TrackingResult, TrackingStep } from "@/lib/biteship/fetch-tracking";

// ─── Status config ─────────────────────────────────────────────────────────

export type StepCfg = { label: string; Icon: React.ElementType; color: string; bg: string };

export const STEP_CFG: Record<string, StepCfg> = {
  confirmed:    { label: "Pesanan Dikonfirmasi",  Icon: CheckCircle2, color: "text-blue-500",     bg: "bg-blue-50"      },
  allocated:    { label: "Kurir Dialokasikan",    Icon: UserCheck,    color: "text-blue-500",     bg: "bg-blue-50"      },
  picking_up:   { label: "Penjemputan",           Icon: MapPin,       color: "text-amber-500",    bg: "bg-amber-50"     },
  picked:       { label: "Paket Diambil",         Icon: PackageCheck, color: "text-[#EA5329]",    bg: "bg-[#FFF0E8]"   },
  in_transit:   { label: "Dalam Perjalanan",      Icon: Truck,        color: "text-[#EA5329]",    bg: "bg-[#FFF0E8]"   },
  dropping_off: { label: "Dalam Pengiriman",      Icon: Truck,        color: "text-[#EA5329]",    bg: "bg-[#FFF0E8]"   },
  delivered:    { label: "Paket Terkirim",        Icon: Home,         color: "text-green-600",    bg: "bg-green-50"     },
  rejected:     { label: "Ditolak",               Icon: XCircle,      color: "text-red-500",      bg: "bg-red-50"       },
  cancelled:    { label: "Dibatalkan",            Icon: XCircle,      color: "text-red-500",      bg: "bg-red-50"       },
  returned:     { label: "Diretur",               Icon: RotateCcw,    color: "text-yellow-600",   bg: "bg-yellow-50"    },
};

export const FALLBACK_CFG: StepCfg = {
  label: "Update",
  Icon: Circle,
  color: "text-[#a0a0a0]",
  bg: "bg-[#f5f5f7]",
};

export const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  pending:      "Menunggu Konfirmasi",
  confirmed:    "Pesanan Dikonfirmasi",
  allocated:    "Kurir Dialokasikan",
  picking_up:   "Penjemputan",
  picked:       "Paket Diambil",
  dropping_off: "Dalam Pengiriman",
  delivered:    "Paket Terkirim",
  rejected:     "Ditolak",
  cancelled:    "Dibatalkan",
  returned:     "Diretur",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

type StepGroup = { status: string; steps: TrackingStep[] };

/** Group consecutive steps with the same status into a single phase entry. */
function groupConsecutive(steps: TrackingStep[]): StepGroup[] {
  const groups: StepGroup[] = [];
  for (const step of steps) {
    const last = groups.at(-1);
    if (last && last.status === step.status) {
      last.steps.push(step);
    } else {
      groups.push({ status: step.status, steps: [step] });
    }
  }
  return groups;
}

export function formatTrackingTime(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }) + " WIB";
}

/** Foto bukti dari kurir — klik untuk buka ukuran penuh. */
function ProofPhotos({ images }: { images: string[] }) {
  if (images.length === 0) return null;
  return (
    <div className="mt-2.5">
      <p className="mb-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#7a7a7a]">
        <Camera className="h-3 w-3" strokeWidth={2.25} />
        Foto bukti dari kurir
      </p>
      <div className="flex flex-wrap gap-2">
        {images.map((url, i) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-lg border border-[#e0e0e0] bg-white transition-opacity hover:opacity-85"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Foto bukti pengiriman ${i + 1}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-28 w-24 object-cover sm:h-32 sm:w-28"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

function StepBody({ step, emphasize }: { step: TrackingStep; emphasize: boolean }) {
  return (
    <>
      {step.description && (
        <p
          className={[
            "text-[13px] leading-relaxed",
            emphasize ? "font-medium text-[#1d1d1f]" : "text-[#5c5c5c]",
          ].join(" ")}
        >
          {step.description}
        </p>
      )}
      {step.at && (
        <p className="mt-0.5 text-[11px] font-medium tabular-nums text-[#b0b0b0]">
          {formatTrackingTime(step.at)}
        </p>
      )}
      <ProofPhotos images={step.images} />
    </>
  );
}

// ─── Timeline ──────────────────────────────────────────────────────────────

export function TrackingTimeline({ result }: { result: TrackingResult }) {
  if (!result.ok || result.steps.length === 0) return null;

  // Steps newest-first → reverse ke kronologis (oldest → newest, atas → bawah)
  const steps = [...result.steps].reverse();
  const groups = groupConsecutive(steps);
  const lastGroupIdx = groups.length - 1;

  return (
    <div>
      <p className="mb-5 text-[11px] font-bold uppercase tracking-widest text-[#a0a0a0]">
        Riwayat Pengiriman
      </p>
      <div>
        {groups.map((group, gi) => {
          const cfg = STEP_CFG[group.status] ?? FALLBACK_CFG;
          const { Icon } = cfg;
          const isCurrent = gi === lastGroupIdx;
          const isMulti = group.steps.length > 1;

          return (
            <div key={gi} className="flex gap-3">
              {/* ── Left: Icon + connector ── */}
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    isCurrent
                      ? "bg-[#EA5329] ring-4 ring-[#EA5329]/15"
                      : `${cfg.bg} border border-[#e0e0e0]`,
                  ].join(" ")}
                >
                  <Icon
                    className={`h-[15px] w-[15px] ${isCurrent ? "text-white" : cfg.color}`}
                    strokeWidth={2}
                  />
                </div>
                {gi < lastGroupIdx && (
                  <div className={["my-1 w-px flex-1 bg-[#e0e0e0]", isMulti ? "min-h-2" : "min-h-6"].join(" ")} />
                )}
              </div>

              {/* ── Right: Content ── */}
              <div className={["min-w-0 flex-1", gi < lastGroupIdx ? "pb-5" : "pb-0"].join(" ")}>
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={[
                      "text-[14px] font-semibold leading-snug tracking-tight",
                      isCurrent ? "text-[#EA5329]" : "text-[#1d1d1f]",
                    ].join(" ")}
                  >
                    {cfg.label}
                  </p>
                  {isCurrent && (
                    <span className="rounded-full bg-[#EA5329]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#EA5329]">
                      Saat ini
                    </span>
                  )}
                </div>

                {!isMulti && (
                  <div className="mt-1">
                    <StepBody step={group.steps[0]} emphasize={false} />
                  </div>
                )}

                {isMulti && (
                  <div className="mt-2.5 border-l-2 border-[#ececec] pl-3.5">
                    {group.steps.map((s, si) => {
                      const isLastSub = si === group.steps.length - 1;
                      return (
                        <div key={si} className={["relative", isLastSub ? "" : "pb-3.5"].join(" ")}>
                          <div
                            className={[
                              "absolute -left-[19px] top-[5px] h-2 w-2 rounded-full border",
                              isLastSub && isCurrent
                                ? "border-[#EA5329] bg-[#EA5329]"
                                : "border-[#d0d0d0] bg-white",
                            ].join(" ")}
                          />
                          <StepBody step={s} emphasize={isLastSub && isCurrent} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
