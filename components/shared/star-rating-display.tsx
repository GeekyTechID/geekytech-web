import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type StarRatingDisplayProps = {
  /** Rating score (0–5). Nilai non-integer dibulatkan ke bintang terdekat. */
  rating: number;
  /** Total bintang yang ditampilkan (default 5). */
  max?: number;
  /** Ukuran ikon bintang. */
  size?: "xs" | "sm" | "md";
  className?: string;
};

const SIZES = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
} as const;

/**
 * Menampilkan baris bintang rating.
 *
 * - Bintang terisi: amber-400 fill + stroke.
 * - Bintang kosong: amber-50 background + amber-200 stroke — tetap terlihat
 *   sebagai bintang, bukan hanya outline.
 */
export function StarRatingDisplay({
  rating,
  max = 5,
  size = "sm",
  className,
}: StarRatingDisplayProps) {
  const filled = Math.round(rating);
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${rating} dari ${max} bintang`}
    >
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={cn(
            SIZES[size],
            i < filled
              ? "fill-amber-400 text-amber-400"
              : "fill-amber-50 text-amber-200",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}
