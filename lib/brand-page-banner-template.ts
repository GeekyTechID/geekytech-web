/** Banner hero atas halaman brand (`banners.template`). */
export function brandMainBannersTemplate(slug: string): string {
  return `brand_main:${slug}`;
}

/** Banner promosi tengah halaman brand (di atas toolbar katalog). */
export function brandSecondaryBannersTemplate(slug: string): string {
  return `brand_secondary:${slug}`;
}
