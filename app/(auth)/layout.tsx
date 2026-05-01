import { SiteLogo } from "@/components/shared/site-logo";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Panel kiri — brand (hidden di mobile) */}
      <div className="hidden lg:flex flex-col justify-between bg-black text-white p-12 border-r border-white/10">
        <SiteLogo variant="authPanel" />

        <div className="space-y-6">
          <p className="text-5xl font-black leading-[1.05] tracking-tight uppercase">
            Toko
            <br />
            Tech &
            <br />
            Gadget
            <br />
            <span className="text-[#EA5329]">Terpercaya.</span>
          </p>
          <p className="text-white/60 text-sm font-medium max-w-xs leading-relaxed">
            Produk original bergaransi resmi. Pengiriman ke seluruh
            Indonesia.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
          {[
            { value: "107+", label: "Produk" },
            { value: "3.5K+", label: "Pelanggan" },
            { value: "23K+", label: "Transaksi" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-black text-[#EA5329]">{stat.value}</p>
              <p className="text-white/50 text-xs uppercase tracking-widest mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Panel kanan — konten (form) */}
      <div className="flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="flex items-center justify-between p-6 border-b border-border lg:hidden">
          <SiteLogo variant="authMobile" />
        </div>

        <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
