import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { fetchShopBrands } from "@/lib/data/home-storefront";

const FOOTER_DISCOVER = [
  { label: "Tentang kami", href: "/about" },
  { label: "Kontak", href: "/contact" },
  { label: "Syarat & Ketentuan", href: "/terms" },
  { label: "FAQ", href: "/faq" },
  { label: "Kebijakan privasi", href: "/privacy" },
] as const;

const FOOTER_SOCIAL = [
  { label: "Instagram", href: "https://instagram.com/geekytech.id" },
  { label: "Tiktok", href: "https://tiktok.com/@geekytech.id" },
  { label: "X", href: "https://x.com/geekytech" },
] as const;

const FOOTER_MARKETPLACES = [
  { label: "Tokopedia", href: "https://tokopedia.com" },
  { label: "Shopee", href: "https://shopee.co.id" },
  { label: "Blibli", href: "https://blibli.com" },
  { label: "TikTok shop", href: "https://www.tiktok.com" },
] as const;

export async function StoreFooter() {
  const brands = await fetchShopBrands();
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto overflow-hidden bg-gradient-to-br from-[#121212] via-[#121212] to-[#121212]/90 text-white">
      <div className="relative z-10 mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex justify-between gap-12 lg:gap-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
          <div className="space-y-4">
            <h2 className="text-2xl font-black leading-tight tracking-tight text-white md:text-3xl">
              Mau Jadi yang Pertama Tahu? <br /> Daftar Newsletter Kami!
            </h2>

            <p className="max-w-sm text-sm leading-relaxed text-white/60">
              Dapatkan info produk rating tertinggi dan promo eksklusif Gebyar Merdeka langsung di inbox-mu.
            </p>
            
            <form className="relative mt-2 max-w-md" action="#" method="post">
              <label htmlFor="footer-newsletter" className="sr-only">
                Email newsletter
              </label>
              <input
                id="footer-newsletter"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Email kamu.."
                className="h-12 w-full rounded-full border border-white/25 bg-transparent pl-5 pr-14 text-sm text-white placeholder:text-white/45 focus:border-white focus:outline-none"
              />
              <button
                type="button"
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/90"
                aria-label="Daftar newsletter"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <p className="relative z-10 mt-14 text-xs text-white/45">
              © {year} GeekyTech by CV. Sentosa Berkat Jaya. All rights reserved.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-white/45">Brand</p>
              <ul className="space-y-2.5 text-sm text-white/90">
                {brands.slice(0, 12).map((b) => (
                  <li key={b.id}>
                    <Link href={`/products?brand=${encodeURIComponent(b.slug)}`} className="transition hover:text-brand">
                      {b.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-white/45">Discover</p>
              <ul className="space-y-2.5 text-sm text-white/90">
                {FOOTER_DISCOVER.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition hover:text-brand">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-white/45">Sosial Media</p>
              <ul className="space-y-2.5 text-sm text-white/90">
                {FOOTER_SOCIAL.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="transition hover:text-brand">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-white/45">Marketplace</p>
              <ul className="space-y-2.5 text-sm text-white/90">
                {FOOTER_MARKETPLACES.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="transition hover:text-brand">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <p
        className="pointer-events-none bottom-0 select-none text-center text-[25rem] font-thin leading-none tracking-tight text-white/[0.06]"
        aria-hidden
      >
        geekytech
      </p>
    </footer>
  );
}
