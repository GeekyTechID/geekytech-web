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

  if (isSent) {
    return (
      <div className="space-y-8">
        <div className="space-y-6">
          <div className="w-14 h-14 bg-black flex items-center justify-center">
            <MailCheck className="text-white" size={24} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight uppercase">
              Cek Email Kamu
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Link reset password telah dikirim ke{" "}
              <span className="font-semibold text-foreground">{sentEmail}</span>.
              Cek inbox (dan folder spam) kamu.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onSubmit({ email: sentEmail })}
            disabled={isLoading}
            className="w-full h-11 rounded-none font-semibold border-foreground/30 hover:border-foreground"
          >
            {isLoading && <Loader2 size={16} className="animate-spin mr-2" />}
            Kirim ulang email
          </Button>
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

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight uppercase">
          Lupa Password
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Masukkan emailmu dan kami kirimkan link untuk membuat password baru.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            aria-invalid={!!errors.email}
            className="h-11 border-foreground/30 focus-visible:border-foreground rounded-none"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-none font-bold uppercase tracking-widest text-sm bg-black text-white hover:bg-black/80"
        >
          {isLoading && <Loader2 size={16} className="animate-spin mr-2" />}
          Kirim Link Reset
        </Button>
      </form>

      {/* Back link */}
      <Link href="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} />
        Kembali ke halaman masuk
      </Link>
    </div>
  );
}
