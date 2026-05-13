import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { formatDate } from "@/lib/format";
import type { Json } from "@/types/supabase";

function parseTrackingHistory(raw: Json): { label: string; at?: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { label: string; at?: string }[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const o = entry as Record<string, unknown>;
    const status = typeof o.status === "string" ? o.status : "";
    const note = typeof o.note === "string" ? o.note : typeof o.description === "string" ? o.description : "";
    const atRaw = o.updated_at ?? o.timestamp ?? o.created_at ?? o.time;
    const at = typeof atRaw === "string" ? atRaw : undefined;
    const label = [status, note].filter(Boolean).join(" — ") || JSON.stringify(entry);
    out.push({ label, at });
  }
  return out;
}

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/orders/${id}/tracking`);

  const detail = await fetchOrderDetailForUser(user.id, id);
  if (!detail) notFound();

  const { shipments } = detail;

  return (
    <div className="rounded-xl border border-[#e0e0e0] bg-white p-5 sm:p-6">
      <h2 className="text-lg font-bold text-[#1d1d1f]">Lacak pengiriman</h2>
      <p className="mt-1 text-sm text-[#5c5c5c]">
        Riwayat di bawah bersumber dari data kurir terakhir. Segarkan halaman untuk pembaruan status.
      </p>

      {shipments.length === 0 ? (
        <p className="mt-6 text-sm text-[#5c5c5c]">Belum ada resi — tim kami akan memperbarui setelah pengiriman dibuat.</p>
      ) : (
        <div className="mt-8 space-y-8">
          {shipments.map((s) => {
            const steps = parseTrackingHistory(s.tracking_history);
            return (
              <div key={s.id} className="border-t border-[#e0e0e0] pt-6 first:border-t-0 first:pt-0">
                <p className="font-semibold text-[#1d1d1f]">
                  {s.courier_company} · {s.courier_service}
                </p>
                {s.awb ? (
                  <p className="mt-1 font-mono text-sm">
                    AWB: {s.awb}
                    <span className="ml-2 text-xs font-normal text-[#7a7a7a]">(gunakan di situs resmi {s.courier_company})</span>
                  </p>
                ) : null}
                <p className="mt-2 text-xs uppercase tracking-wide text-[#7a7a7a]">Status: {s.status}</p>
                {steps.length === 0 ? (
                  <p className="mt-4 text-sm text-[#5c5c5c]">Belum ada riwayat titik perjalanan.</p>
                ) : (
                  <ol className="mt-4 space-y-3 border-l border-[#e0e0e0] pl-4">
                    {steps.map((step, i) => (
                      <li key={`${s.id}-${i}`} className="relative">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#EA5329]" aria-hidden />
                        <p className="text-sm text-[#1d1d1f]">{step.label}</p>
                        {step.at ? <p className="text-xs text-[#7a7a7a]">{formatDate(step.at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p> : null}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
