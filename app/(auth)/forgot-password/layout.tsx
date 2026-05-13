import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function ForgotPasswordLayout({
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
          <p className="max-w-lg text-[clamp(2rem,4vw,2.5rem)] font-semibold uppercase leading-[1.1] tracking-[-0.02em] text-white">
            Reset
            <br />
            kata sandi.
            <br />
            <span className="normal-case text-[#EA5329]">GeekyTech.</span>
          </p>
          <p className="mt-6 max-w-md text-[16px] font-normal leading-relaxed text-white lg:max-w-xs">
            Kami akan kirimkan link reset ke emailmu. Proses hanya butuh beberapa
            detik.
          </p>
        </>
      }
    >
      {children}
    </AuthSplitShell>
  );
}
