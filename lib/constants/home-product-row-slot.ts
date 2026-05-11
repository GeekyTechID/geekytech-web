/**
 * Satu slot produk dalam baris maksimal 5 item (sama gap dengan `HorizontalScrollRow` flash: gap-3 / sm:gap-4).
 * 4 × 0.75rem = 3rem (gap-3), 4 × 1rem = 4rem (gap-4).
 *
 * Pada kontainer `max-w-[1400px]` + `px-8` (32px×2) + `gap-4` (16px×4):
 * lebar slot ≈ (1400 − 64 − 64) / 5 ≈ **254px** — dipakai sebagai hint `sizes` Next/Image.
 */
export const HOME_PRODUCT_FIVE_ACROSS_SLOT_CLASS =
  "box-border w-[calc((100%-3rem)/5)] min-w-[calc((100%-3rem)/5)] max-w-[calc((100%-3rem)/5)] shrink-0 sm:w-[calc((100%-4rem)/5)] sm:min-w-[calc((100%-4rem)/5)] sm:max-w-[calc((100%-4rem)/5)]";

/** Hint lebar tampil gambar untuk slot 1/5 (selaras formula slot di atas). */
export const HOME_PRODUCT_FIVE_ACROSS_IMAGE_SIZES =
  "(min-width: 1280px) 254px, (min-width: 640px) calc((100vw - 6.5rem) / 5), calc((100vw - 4rem) / 5)";
