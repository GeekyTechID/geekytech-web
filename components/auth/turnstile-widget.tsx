"use client";

import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

type TurnstileWidgetProps = {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
};

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_ID = "cf-turnstile-script";

export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  theme = "auto",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const handleExpire = useCallback(() => {
    widgetIdRef.current = null;
    onExpire?.();
  }, [onExpire]);

  const handleError = useCallback(() => {
    widgetIdRef.current = null;
    onError?.();
  }, [onError]);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !SITE_KEY) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: onVerify,
      "expired-callback": handleExpire,
      "error-callback": handleError,
      theme,
    });
  }, [onVerify, handleExpire, handleError, theme]);

  useEffect(() => {
    if (!SITE_KEY) return;

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existingScript = document.getElementById(SCRIPT_ID);
    if (!existingScript) {
      window.onTurnstileLoad = renderWidget;
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener("load", renderWidget);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    };
  }, [renderWidget]);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} className="mt-2" />;
}
