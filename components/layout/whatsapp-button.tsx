"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
const WA_MESSAGE = encodeURIComponent(
  "Halo GeekyTech, saya ingin bertanya tentang produk.",
);

export function WhatsAppButton({ className }: { className?: string }) {
  if (!WA_NUMBER) return null;

  return (
    <a
      href={`https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Hubungi CS via WhatsApp"
      className={cn(
        "fixed z-50 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] md:bottom-6 md:right-6",
        "flex items-center gap-2 px-4 py-3",
        "bg-[#25D366] text-white",
        "shadow-lg hover:bg-[#20B358]",
        "transition-swiss group",
        className,
      )}
    >
      <MessageCircle size={20} className="shrink-0" />
      <span className="text-xs font-bold uppercase tracking-wide hidden sm:inline">
        Chat CS
      </span>
    </a>
  );
}
