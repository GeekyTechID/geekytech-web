import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStoreOrigin, getWhatsappCs } from "@/lib/settings/queries";
import { getStoreOriginFullAddress } from "@/lib/settings/store-origin";

const FOOTER_ABOUT = [
  { label: "Our Story", href: "/about" },
  { label: "Blog & News", href: "/blog" },
  { label: "Privacy Policy", href: "/kebijakan-privasi" },
  { label: "Terms & Conditions", href: "/syarat-ketentuan" },
  { label: "Return Policy", href: "/kebijakan-pengembalian" },
] as const;

const FOOTER_SOCIAL = [
  { label: "Instagram", href: "https://instagram.com/geekytech.id" },
  { label: "Tiktok", href: "https://tiktok.com/@geekytech.id" },
  { label: "Youtube", href: "https://youtube.com/@geekyhubid?si=E3oBV_1iD5RBi0vs" },
] as const;

const FOOTER_MARKETPLACES = [
  { label: "Tokopedia", href: "https://tokopedia.com" },
  { label: "Shopee", href: "https://shopee.co.id" },
  { label: "Blibli", href: "https://blibli.com" },
  { label: "TikTok shop", href: "https://www.tiktok.com" },
  { label: "Lazada", href: "https://www.lazada.co.id/shop/geekytech-store/?path=index.htm" },
] as const;

export async function StoreFooter() {
  const [storeOrigin, whatsappCs] = await Promise.all([getStoreOrigin(), getWhatsappCs()]);
  const year = new Date().getFullYear();
  const fullAddress = getStoreOriginFullAddress(storeOrigin);

  return (
    <footer className="relative mt-auto overflow-hidden bg-gradient-to-br from-[#121212] via-[#121212] to-[#121212]/90 pt-12 text-white">
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-24 lg:py-16">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-20">
          <div className="min-w-0 space-y-4 lg:max-w-xl">
            <h2 className="text-2xl font-black leading-tight text-white md:text-3xl">
              Mau Jadi yang Pertama Tahu? <br /> Daftar Newsletter Kami!
            </h2>

            <p className="max-w-sm text-sm leading-relaxed text-white/60">
              Dapatkan info produk rating tertinggi dan promo eksklusif Gebyar Merdeka langsung di inbox-mu.
            </p>
            
            <form className="mt-2 max-w-md" action="#" method="post">
              <label htmlFor="footer-newsletter" className="sr-only">
                Email newsletter
              </label>
              <div className="flex h-12 items-center gap-1 rounded-full border border-white/25 bg-transparent pl-5 pr-1.5 focus-within:border-white focus-within:ring-3 focus-within:ring-white/30">
                <Input
                  id="footer-newsletter"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email kamu.."
                  className="h-auto min-h-0 flex-1 border-0 bg-transparent p-0 text-sm text-white shadow-none placeholder:text-white/45 focus-visible:border-transparent focus-visible:ring-0"
                />
                <Button
                  type="submit"
                  size="icon-sm"
                  className="size-9 shrink-0 rounded-full border-0 bg-white p-0 text-black hover:bg-white/90"
                  aria-label="Daftar newsletter"
                >
                  <ChevronRight className="size-4" strokeWidth={2.25} aria-hidden />
                </Button>
              </div>
            </form>

            <div className="relative z-10 mt-14 space-y-1.5 text-xs text-white/45">
              <p>© {year} GeekyTech. All rights reserved.</p>
              {fullAddress && <p>{fullAddress}</p>}
              {whatsappCs && (
                <p>
                  WhatsApp:{" "}
                  <a
                    href={`https://wa.me/${whatsappCs}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:text-white hover:underline"
                  >
                    +{whatsappCs}
                  </a>
                </p>
              )}
            </div>
          </div>

          <div className="min-w-0 grid gap-10 grid-cols-2 sm:grid-cols-3">
            <div>
              <p className="mb-4 text-[10px] font-semibold uppercase text-white/45">About</p>
              <ul className="space-y-2.5 text-sm text-white/90">
                {FOOTER_ABOUT.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition hover:text-brand">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-4 text-[10px] font-semibold uppercase text-white/45">Sosial Media</p>
              <ul className="space-y-2.5 text-sm text-white/90">
                {FOOTER_SOCIAL.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition hover:text-brand"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-4 text-[10px] font-semibold uppercase text-white/45">Marketplace</p>
              <ul className="space-y-2.5 text-sm text-white/90">
                {FOOTER_MARKETPLACES.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition hover:text-brand"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
