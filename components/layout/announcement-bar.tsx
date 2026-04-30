"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type AnnouncementBarProps = {
  text: string;
  link?: string;
};

const STORAGE_KEY = "geekytech-announcement-dismissed";

export function AnnouncementBar({ text, link }: AnnouncementBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const content = (
    <span className="text-xs sm:text-sm font-medium">{text}</span>
  );

  return (
    <div
      role="banner"
      className="relative bg-black text-white px-4 py-2 flex items-center justify-center gap-3 dark:bg-[#EA5329]"
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
      <button
        onClick={dismiss}
        aria-label="Tutup pengumuman"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-swiss p-1"
      >
        <X size={14} />
      </button>
    </div>
  );
}

