"use client";
import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

export function ChatTypingIndicator() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const dots = containerRef.current?.querySelectorAll(".typing-dot");
      if (!dots?.length) return;
      const tl = gsap.timeline({ repeat: -1 });
      dots.forEach((dot, i) => {
        tl.to(dot, { y: -4, duration: 0.3, ease: "power1.out" }, i * 0.15)
          .to(dot, { y: 0, duration: 0.3, ease: "power1.in" }, i * 0.15 + 0.3);
      });
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      role="status"
      aria-label="Sedang mengetik"
      className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-2.5 w-fit"
    >
      <span className="typing-dot block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
      <span className="typing-dot block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
      <span className="typing-dot block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
    </div>
  );
}
