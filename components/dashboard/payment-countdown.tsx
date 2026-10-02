"use client";

import { useSyncExternalStore } from "react";

function subscribeEverySecond(onTick: () => void): () => void {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

// Detik saat ini (bukan ms) supaya snapshot stabil di antara tick.
const getNowSecs = () => Math.floor(Date.now() / 1000);
// Server tidak merender waktu — sisa waktu dihitung di client, jadi HTML server
// tidak pernah beda dengan render hydrasi (sebelumnya: hydration mismatch).
const getServerNowSecs = () => null;

function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h}j ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}d`;
  }
  return `${m}m ${String(s).padStart(2, "0")}d`;
}

export function PaymentCountdown({ expiryTime }: { expiryTime: string }) {
  const nowSecs = useSyncExternalStore(subscribeEverySecond, getNowSecs, getServerNowSecs);

  if (nowSecs === null) {
    return (
      <span className="font-mono text-[11px] font-semibold tabular-nums text-[#EA5329]">
        --
      </span>
    );
  }

  const secs = Math.max(0, Math.floor(new Date(expiryTime).getTime() / 1000) - nowSecs);

  if (secs <= 0) {
    return (
      <span className="font-mono text-[11px] font-semibold text-red-600">
        Kedaluwarsa
      </span>
    );
  }

  const isUrgent = secs < 30 * 60;
  return (
    <span
      className={`font-mono text-[11px] font-semibold tabular-nums ${
        isUrgent ? "text-red-600" : "text-[#EA5329]"
      }`}
    >
      {formatCountdown(secs)}
    </span>
  );
}
