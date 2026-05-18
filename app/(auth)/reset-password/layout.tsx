import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthSplitShell
      imageSrc="/image-masuk.jpg"
      formMaxWidthClass="max-w-md"
      leftPanel={
        <>
          <p className="max-w-lg text-[clamp(2rem,4vw,2.5rem)] font-semibold uppercase leading-[1.1] text-white">
            Buat kata
            <br />
            sandi baru.
            <br />
            <span className="normal-case text-[#EA5329]">GeekyTech.</span>
          </p>
          <p className="mt-6 max-w-md text-[16px] font-normal leading-relaxed text-white lg:max-w-xs">
            Pilih kata sandi yang kuat untuk melindungi akunmu.
          </p>
        </>
      }
    >
      {children}
    </AuthSplitShell>
  );
}
