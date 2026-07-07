"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  HEADER_DROPDOWN_PANEL_CLASS,
  HeaderDropdownPanelHeader,
  HeaderDropdownPanelBody,
} from "@/components/shared/header-dropdown-panel";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { ChatPopup } from "./chat-popup";
import { ChatSessionForm } from "./chat-session-form";
import type { ChatSession } from "@/types/chat";

export function ChatWidget() {
  const user = useAuthStore((s) => s.user);
  const { isOpen, activeSession, unreadCount, setOpen, setActiveSession } = useChatStore();
  const [initialized, setInitialized] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Fetch active session on user login
  useEffect(() => {
    if (!user) return;
    fetch("/api/chat/sessions")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setActiveSession(json.data as ChatSession);
      })
      .finally(() => setInitialized(true));
  }, [user, setActiveSession]);

  // Animate popup open
  useGSAP(
    () => {
      if (!isOpen || !popupRef.current) return;
      gsap.fromTo(
        popupRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: "power2.out" },
      );
    },
    { dependencies: [isOpen], scope: popupRef },
  );

  function handleClose() {
    if (!popupRef.current) { setOpen(false); return; }
    gsap.to(popupRef.current, {
      opacity: 0, y: 20, scale: 0.95,
      duration: 0.2, ease: "power2.in",
      onComplete: () => setOpen(false),
    });
  }

  function handleSessionCreated(sessionId: string) {
    fetch(`/api/chat/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setActiveSession(json.data as ChatSession); });
  }

  const showForm = !!user && initialized && !activeSession;
  const showChat = !!user && initialized && !!activeSession;

  return (
    <>
      {/* Popup panel */}
      {isOpen && (
        <div
          ref={popupRef}
          className={cn(
            "fixed z-50",
            HEADER_DROPDOWN_PANEL_CLASS,
            "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]",
            "md:bottom-20 md:right-6",
            "w-[calc(100vw-2rem)] max-w-[420px]",
            !user || showForm ? "h-auto" : "h-[600px] max-h-[80vh]",
          )}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 z-10 rounded-full p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Tutup chat"
          >
            <X size={14} />
          </button>

          {!user && (
            <div className="flex flex-col">
              <HeaderDropdownPanelHeader title="Chat CS" />
              <HeaderDropdownPanelBody className="flex flex-col items-center gap-4 p-6 text-center">
                <MessageCircle size={28} className="text-[#EA5329]" />
                <div>
                  <p className="text-[14px] font-semibold text-[#1d1d1f]">
                    Masuk untuk mulai chat
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.43] text-[#7a7a7a]">
                    Masuk atau daftar dulu supaya tim kami bisa membalas pertanyaanmu.
                  </p>
                </div>
                <Link
                  href={`/login?redirectTo=${encodeURIComponent(pathname)}`}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#EA5329] px-5 text-[13px] font-bold uppercase text-white transition-colors hover:bg-[#d44820]"
                >
                  Masuk / Daftar
                </Link>
              </HeaderDropdownPanelBody>
            </div>
          )}
          {showForm && <ChatSessionForm onCreated={handleSessionCreated} />}
          {showChat && <ChatPopup />}
        </div>
      )}

      {/* Floating button — hidden when popup is open */}
      <button
        type="button"
        onClick={() => (isOpen ? handleClose() : setOpen(true))}
        aria-label={isOpen ? "Tutup chat" : "Buka chat CS"}
        className={cn(
          "fixed z-50",
          "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]",
          "md:bottom-6 md:right-6",
          "flex items-center gap-2 rounded-full px-4 py-3",
          "bg-primary text-primary-foreground shadow-lg hover:bg-primary/90",
          "transition-all duration-200",
          isOpen && "opacity-0 pointer-events-none scale-90",
        )}
      >
        <MessageCircle size={20} className="shrink-0" />
        <span className="hidden text-xs font-bold uppercase sm:inline">Chat CS</span>
        {unreadCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-primary">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
