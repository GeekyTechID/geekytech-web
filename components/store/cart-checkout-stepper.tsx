import Link from "next/link";

import { cn } from "@/lib/utils";

const steps = [
  { step: 1 as const, label: "Cart", href: "/cart" },
  { step: 2 as const, label: "Checkout", href: "/checkout" },
  { step: 3 as const, label: "Done", href: null },
];

export function CartCheckoutStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Langkah belanja" className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 sm:gap-x-4 md:gap-x-6">
      {steps.map((s, i) => {
        const active = s.step === current;
        const done = s.step < current;
        const content = (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition",
              active && "border-black bg-black text-white",
              done && !active && "border-[#EA5329] bg-[#EA5329] text-white",
              !active && !done && "border-[#d4d0c8] bg-white text-[#9a9590]",
            )}
          >
            {s.step}
          </span>
        );
        const label = (
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wider sm:text-sm",
              active && "text-[#1d1d1f]",
              done && !active && "text-[#EA5329]",
              !active && !done && "text-[#9a9590]",
            )}
          >
            {s.label}
          </span>
        );

        return (
          <div key={s.step} className="flex items-center gap-2 sm:gap-3">
            {i > 0 ? <span className="hidden h-px w-6 bg-[#d4d0c8] sm:block sm:w-10" aria-hidden /> : null}
            <div className="flex items-center gap-2">
              {s.href ? (
                <Link href={s.href} className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[#EA5329]/40">
                  {content}
                  {label}
                </Link>
              ) : (
                <div className="flex cursor-not-allowed items-center gap-2 opacity-60">
                  {content}
                  {label}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
