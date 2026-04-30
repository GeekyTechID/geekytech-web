import { Wrench } from "lucide-react";

export function MaintenancePage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <div className="mb-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#EA5329] flex items-center justify-center">
            <span className="text-white font-black text-base">G</span>
          </div>
          <span className="text-3xl font-black uppercase tracking-tight">
            GeekyTech
          </span>
        </div>
      </div>

      {/* Icon */}
      <div className="w-20 h-20 border-2 border-white/20 flex items-center justify-center mb-8">
        <Wrench size={32} className="text-[#EA5329]" />
      </div>

      {/* Content */}
      <h1 className="text-swiss-heading text-white mb-4">
        Sedang Dalam
        <br />
        <span className="text-[#EA5329]">Pemeliharaan</span>
      </h1>

      <p className="text-white/60 text-sm leading-relaxed max-w-sm mb-8">
        Website GeekyTech sedang dalam pemeliharaan untuk meningkatkan layanan.
        Kami akan segera kembali. Terima kasih atas kesabaran Anda.
      </p>

      {/* Divider Swiss */}
      <div className="w-16 h-px bg-[#EA5329] mb-8" />

      {/* Contact */}
      <p className="text-white/40 text-xs">
        Butuh bantuan mendesak?{" "}
        <a
          href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`}
          className="text-white/70 hover:text-white underline underline-offset-2 transition-colors"
        >
          Hubungi kami via WhatsApp
        </a>
      </p>
    </div>
  );
}
