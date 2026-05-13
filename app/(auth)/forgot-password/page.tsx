"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validations/auth";
import { AUTH_INPUT_CLASS } from "@/lib/auth/auth-field-classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSentEmail(values.email);
      setIsSent(true);
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!sentEmail) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(sentEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Link reset password berhasil dikirim ulang.");
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="space-y-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EA5329]/10">
          <MailCheck className="text-[#EA5329]" size={28} />
        </div>

        <div className="space-y-3">
          <h1 className="text-[28px] font-semibold leading-[1.14] tracking-[0.007em] text-[#1d1d1f]">
            Cek Email Kamu
          </h1>
          <p className="text-[17px] font-normal leading-[1.47] tracking-[-0.022em] text-[#1d1d1f]">
            Link reset password telah dikirim ke{" "}
            <span className="font-semibold">{sentEmail}</span>. Cek inbox dan
            folder spam kamu.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            onClick={handleResend}
            disabled={isLoading}
            className="h-12 w-full rounded-lg border-0 bg-[#EA5329] text-[17px] font-normal leading-none text-white shadow-none transition-transform hover:bg-[#d44820] active:scale-[0.95] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A52] disabled:opacity-50"
          >
            {isLoading && <Loader2 size={16} className="mr-2 animate-spin" />}
            Kirim ulang email
          </Button>
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

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold leading-[1.14] tracking-[0.007em] text-[#1d1d1f]">
          Lupa Kata Sandi?
        </h1>
        <p className="text-[17px] font-normal leading-[1.47] tracking-[-0.022em] text-[#1d1d1f]">
          Masukkan emailmu dan kami kirimkan link untuk membuat kata sandi baru.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-[14px] font-normal leading-[1.43] tracking-[-0.014em] text-[#1d1d1f]"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Masukin email kamu"
            aria-invalid={!!errors.email}
            className={AUTH_INPUT_CLASS}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-[14px] text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-lg border-0 bg-[#EA5329] text-[17px] font-normal leading-none text-white shadow-none transition-transform hover:bg-[#d44820] active:scale-[0.95] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A52] disabled:opacity-50"
        >
          {isLoading && <Loader2 size={16} className="mr-2 animate-spin" />}
          Kirim Link Reset
        </Button>
      </form>

      <Link
        href="/login"
        className="flex items-center gap-2 text-[14px] font-normal leading-[1.43] tracking-[-0.014em] text-[#7a7a7a] transition-colors hover:text-[#1d1d1f]"
      >
        <ArrowLeft size={14} />
        Kembali ke halaman masuk
      </Link>
    </div>
  );
}
