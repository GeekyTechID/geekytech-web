import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSplitShell
      imageSrc="/image-daftar.jpg"
      formMaxWidthClass="max-w-lg"
      leftPanel={
        <>
          <p className="max-w-lg text-[clamp(2rem,4vw,2.5rem)] font-semibold uppercase leading-[1.1] text-white">
            Hampir selesai!
            <br />
            Cek email kamu.
            <br />
            <span className="normal-case text-[#EA5329]">GeekyTech.</span>
          </p>
          <p className="mt-6 max-w-md text-[16px] font-normal text-white lg:max-w-xs">
            Satu langkah lagi untuk mulai berbelanja gadget & aksesoris pilihan
            terbaik.
          </p>
        </>
      }
    >
      {children}
    </AuthSplitShell>
  );
}
