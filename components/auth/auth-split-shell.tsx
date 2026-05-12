import Image from "next/image";
import Link from "next/link";

const STORE_HREF = "/";

export type AuthSplitShellProps = {
  imageSrc: string;
  imagePriority?: boolean;
  leftPanel: React.ReactNode;
  /** Lebar area form, mis. max-w-sm | max-w-md | max-w-lg */
  formMaxWidthClass?: string;
  children: React.ReactNode;
};

/**
 * Layout split auth: panel foto + panel form putih.
 * Tautan toko di sudut atas area gelap — panel putih kanan hanya berisi form.
 */
export function AuthSplitShell({
  imageSrc,
  imagePriority = false,
  leftPanel,
  formMaxWidthClass = "max-w-md",
  children,
}: AuthSplitShellProps) {
  return (
    <div className="relative min-h-screen min-h-svh bg-[#111111] p-4 lg:p-6">
      <Link
        href={STORE_HREF}
        className="absolute right-5 top-5 z-30 text-[14px] font-normal leading-[1.29] tracking-[-0.014em] text-[#EA5329] transition-colors hover:text-[#d44820] active:scale-95 lg:right-15 lg:top-15"
      >
        Kunjungi GeekyTech
      </Link>

      <div className="mx-auto flex min-h-[calc(100svh-2.5rem)] max-w-[1920px] flex-col gap-4 pt-11 lg:min-h-[calc(100svh-3rem)] lg:flex-row lg:gap-6 lg:pt-0">
        <div className="relative hidden min-h-0 flex-1 flex-col justify-end overflow-hidden rounded-tr-[1rem] rounded-br-[1rem] lg:flex lg:min-h-[calc(100svh-3rem)]">
          <Image
            src={imageSrc}
            alt=""
            fill
            className="object-cover object-center"
            sizes="50vw"
            priority={imagePriority}
          />
          <div className="absolute inset-0" />
          <div className="relative z-10 p-12 lg:p-16 xl:p-20 pointer-events-none">
            {leftPanel}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-tl-[1rem] rounded-bl-[1rem] bg-white lg:min-h-[calc(100svh-3rem)]">
          <div className="flex flex-col justify-center px-6 py-10 lg:px-12 lg:py-14">
            <div className={`mx-auto w-[70%] ${formMaxWidthClass}`}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
