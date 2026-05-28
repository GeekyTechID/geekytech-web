"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function ChatTypingIndicator() {
  const dot1Ref = useRef<HTMLSpanElement>(null);
  const dot2Ref = useRef<HTMLSpanElement>(null);
  const dot3Ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const dots = [dot1Ref.current, dot2Ref.current, dot3Ref.current].filter(Boolean);
    const tl = gsap.timeline({ repeat: -1 });
    dots.forEach((dot, i) => {
      tl.to(dot, { y: -4, duration: 0.3, ease: "power1.out" }, i * 0.15)
        .to(dot, { y: 0, duration: 0.3, ease: "power1.in" }, i * 0.15 + 0.3);
    });
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-2.5 w-fit">
      <span ref={dot1Ref} className="block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
      <span ref={dot2Ref} className="block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
      <span ref={dot3Ref} className="block h-1.5 w-1.5 rounded-full bg-muted-foreground" />
    </div>
  );
}
