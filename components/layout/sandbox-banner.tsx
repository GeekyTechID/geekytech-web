import { IS_SANDBOX, SANDBOX_LABEL } from "@/lib/app-env";

/** Garis penanda di atas semua halaman saat aplikasi berjalan di db_sandbox. */
export function SandboxBanner() {
  if (!IS_SANDBOX) return null;
  return (
    <div
      role="status"
      className="relative z-50 w-full bg-[#facc15] px-3 py-1 text-center text-[11px] font-bold tracking-wide text-[#1d1d1f] print:hidden"
    >
      {SANDBOX_LABEL} · db_sandbox · Mayar sandbox — bukan transaksi asli
    </div>
  );
}

/** Watermark miring untuk dokumen cetak (resi) saat sandbox. */
export function SandboxWatermark() {
  if (!IS_SANDBOX) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 flex select-none items-center justify-center"
    >
      <span className="-rotate-30 text-[64px] font-black tracking-widest text-[#dc2626]/20">
        {SANDBOX_LABEL}
      </span>
    </div>
  );
}
