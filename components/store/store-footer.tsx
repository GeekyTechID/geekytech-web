import Link from "next/link";

const FOOTER_ADDRESS =
  "Bellezza Shopping Arcade Unit GSA-037, Grogol Utara, Kebayoran Lama, Jakarta Selatan 12210.";
const FOOTER_MAPS_URL = "https://maps.app.goo.gl/mHDWtvoTMQ8hfxQh8";

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

export function StoreFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto overflow-hidden bg-gradient-to-br from-[#121212] via-[#121212] to-[#121212]/90 pt-12 text-white">
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-24 lg:py-16">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-20">
          <div className="min-w-0 space-y-4 lg:max-w-xl">
            <h2 className="text-2xl font-black leading-tight text-white md:text-3xl">
              Experience it in person!
            </h2>

            <div className="relative z-10 mt-6 space-y-1.5 text-xs text-white/45">
              <p>© {year} GeekyTech. All rights reserved.</p>
              <p>{FOOTER_ADDRESS}</p>
              <p>
                <a
                  href={FOOTER_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-white/70 underline underline-offset-2 transition-colors hover:text-white"
                >
                  View Maps
                </a>
              </p>
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
