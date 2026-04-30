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
    <div className="space-y-8">
      {/* Icon */}
      <div className="w-16 h-16 bg-black flex items-center justify-center">
        <MailCheck className="text-white" size={28} />
      </div>

      {/* Content */}
      <div className="space-y-3">
        <h1 className="text-3xl font-black tracking-tight uppercase">
          Verifikasi Email
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Kami telah mengirimkan link verifikasi ke{" "}
          {email ? (
            <span className="font-semibold text-foreground">{email}</span>
          ) : (
            "emailmu"
          )}
          . Klik link tersebut untuk mengaktifkan akunmu.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Tidak menerima email? Cek folder{" "}
          <span className="font-semibold text-foreground">spam</span> atau kirim
          ulang di bawah.
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Actions */}
      <div className="space-y-3">
        {email && (
          <Button
            type="button"
            variant="outline"
            onClick={handleResend}
            disabled={isResending}
            className="w-full h-11 rounded-none font-semibold border-foreground/30 hover:border-foreground"
          >
            {isResending && <Loader2 size={16} className="animate-spin mr-2" />}
            Kirim ulang email verifikasi
          </Button>
        )}

        <Link href="/login">
          <Button
            type="button"
            variant="ghost"
            className="w-full h-11 rounded-none font-semibold"
          >
            <ArrowLeft size={16} className="mr-2" />
            Kembali ke halaman masuk
          </Button>
        </Link>
      </div>
    </div>
  );
}
