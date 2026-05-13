"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error("Email tidak ditemukan. Coba daftar ulang.");
      return;
    }

    setIsResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Email verifikasi berhasil dikirim ulang.");
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EA5329]/10">
        <MailCheck className="text-[#EA5329]" size={28} />
      </div>

      <div className="space-y-3">
        <h1 className="text-[28px] font-semibold leading-[1.14] tracking-[0.007em] text-[#1d1d1f]">
          Verifikasi Email
        </h1>
        <p className="text-[17px] font-normal leading-[1.47] tracking-[-0.022em] text-[#1d1d1f]">
          Kami telah mengirimkan link verifikasi ke{" "}
          {email ? (
            <span className="font-semibold">{email}</span>
          ) : (
            "emailmu"
          )}
          . Klik link tersebut untuk mengaktifkan akunmu.
        </p>
        <p className="text-[14px] font-normal leading-[1.43] tracking-[-0.014em] text-[#7a7a7a]">
          Tidak menerima email? Cek folder{" "}
          <span className="font-semibold text-[#1d1d1f]">spam</span> atau kirim
          ulang di bawah.
        </p>
      </div>

      <div className="space-y-3">
        {email && (
          <Button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="h-12 w-full rounded-lg border-0 bg-[#EA5329] text-[17px] font-normal leading-none text-white shadow-none transition-transform hover:bg-[#d44820] active:scale-[0.95] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A52] disabled:opacity-50"
          >
            {isResending && <Loader2 size={16} className="mr-2 animate-spin" />}
            Kirim ulang email verifikasi
          </Button>
        )}

        <Link href="/login">
          <Button
            type="button"
            variant="ghost"
            className="h-12 w-full rounded-lg text-[17px] font-normal text-[#1d1d1f] shadow-none hover:bg-[#f5f5f7] active:scale-[0.95]"
          >
            <ArrowLeft size={16} className="mr-2" />
            Kembali ke halaman masuk
          </Button>
        </Link>
      </div>
    </div>
  );
}
