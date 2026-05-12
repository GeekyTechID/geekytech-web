import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSplitShell
      imageSrc="/image-masuk.jpg"
      imagePriority
      formMaxWidthClass="max-w-md"
      leftPanel={
        <>
          <p className="max-w-lg text-[clamp(2rem,4vw,2.5rem)] font-semibold uppercase leading-[1.1] tracking-[-0.02em] text-white">
            Gear up.
            <br />
            Level up.
            <br />
            <span className="normal-case text-[#EA5329]">GeekyTech.</span>
          </p>
          <p className="mt-6 max-w-md text-[16px] font-normal leading-relaxed text-white lg:max-w-xs">
            Smartwatch, earphone, aksesoris gadget. Produk original bergaransi resmi. Pengiriman ke
            seluruh Indonesia.
          </p>
        </>
      }
    >
      {children}
    </AuthSplitShell>
  );
}
