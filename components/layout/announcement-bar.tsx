"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

type AnnouncementBarProps = {
  text: string;
  link?: string;
};

const STORAGE_KEY = "geekytech-announcement-dismissed";

const noopSubscribe = () => () => {};

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function AnnouncementBar({ text, link }: AnnouncementBarProps) {
  // Server snapshot = dismissed, so the bar only appears after hydration (as before).
  const dismissedInSession = useSyncExternalStore(noopSubscribe, readDismissed, () => true);
  const [dismissedNow, setDismissedNow] = useState(false);

  const dismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Storage unavailable — still hide for this render tree.
    }
    setDismissedNow(true);
  };

  if (dismissedInSession || dismissedNow) return null;

  const content = (
    <span className="text-xs sm:text-sm font-medium">{text}</span>
  );

  return (
    <div
      role="banner"
      className="relative bg-black text-white px-4 py-2 flex items-center justify-center gap-3[#EA5329]"
    >
      <div className="flex items-center gap-2 text-center">
        {link ? (
          <a
            href={link}
            className="hover:underline underline-offset-2 transition-swiss"
          >
            {content}
          </a>
        ) : (
          content
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={dismiss}
        aria-label="Tutup pengumuman"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:bg-white/10 hover:text-white"
      >
        <X size={14} />
      </Button>
    </div>
  );
}

