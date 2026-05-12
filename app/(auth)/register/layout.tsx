import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSplitShell
      imageSrc="/image-daftar.jpg"
      formMaxWidthClass="max-w-lg"
      leftPanel={
        <>
          <p className="max-w-lg text-[clamp(2rem,4vw,2.5rem)] font-semibold uppercase leading-[1.1] tracking-[-0.02em] text-white">
            Mulai koleksi
            <br />
            gadget terbaikmu.
            <br />
            <span className="normal-case text-[#EA5329]">GeekyTech.</span>
          </p>
          <p className="mt-6 max-w-md text-[16px] font-normal text-white lg:max-w-xs">
            Wearable & aksesoris pilihan kurator. Daftar sekali, belanja dengan tenang — garansi resmi
            & dukungan tim kami.
          </p>
        </>
      }
    >
      {children}
    </AuthSplitShell>
  );
}
