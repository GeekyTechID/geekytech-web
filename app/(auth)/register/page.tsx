"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { registerSchema, type RegisterFormValues } from "@/lib/validations/auth";
import { AUTH_INPUT_CLASS } from "@/lib/auth/auth-field-classes";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const onSubmit = async (values: RegisterFormValues) => {
    const hasTurnstile =
      !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
      process.env.NODE_ENV === "production";
    if (hasTurnstile && !turnstileToken) {
      toast.error("Selesaikan verifikasi keamanan terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const fullName = `${values.first_name.trim()} ${values.last_name.trim()}`.trim();
      const { error } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          data: {
            full_name: fullName,
            phone: values.phone.trim(),
            first_name: values.first_name.trim(),
            last_name: values.last_name.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Email ini sudah terdaftar. Silakan masuk.", {
            action: {
              label: "Masuk",
              onClick: () => router.push("/login"),
            },
          });
        } else {
          toast.error(error.message);
        }
        return;
      }

      router.push("/verify-email?email=" + encodeURIComponent(values.email.trim()));
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (error) toast.error(error.message);
    } catch {
      toast.error("Gagal daftar dengan Google. Coba lagi.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold leading-[1.14] text-[#1d1d1f]">
          Buat Akun Baru
        </h1>
        <p className="text-[17px] font-normal leading-[1.47] text-[#1d1d1f]">
          Daftar untuk mulai belanja di GeekyTech.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="first_name"
              className="text-[14px] font-normal leading-[1.43] text-[#1d1d1f]"
            >
              Nama Depan
            </Label>
            <Input
              id="first_name"
              type="text"
              autoComplete="given-name"
              placeholder="Masukin nama depan"
              aria-invalid={!!errors.first_name}
              className={AUTH_INPUT_CLASS}
              {...register("first_name")}
            />
            {errors.first_name && (
              <p className="text-[14px] text-destructive">{errors.first_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="last_name"
              className="text-[14px] font-normal leading-[1.43] text-[#1d1d1f]"
            >
              Nama Belakang
            </Label>
            <Input
              id="last_name"
              type="text"
              autoComplete="family-name"
              placeholder="Masukin nama belakang"
              aria-invalid={!!errors.last_name}
              className={AUTH_INPUT_CLASS}
              {...register("last_name")}
            />
            {errors.last_name && (
              <p className="text-[14px] text-destructive">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="phone"
              className="text-[14px] font-normal leading-[1.43] text-[#1d1d1f]"
            >
              No Telepon
            </Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Masukin nomor telepon kamu"
              aria-invalid={!!errors.phone}
              className={AUTH_INPUT_CLASS}
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-[14px] text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-[14px] font-normal leading-[1.43] text-[#1d1d1f]"
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-[14px] font-normal leading-[1.43] text-[#1d1d1f]"
            >
              Kata Sandi
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••••"
                aria-invalid={!!errors.password}
                className={`${AUTH_INPUT_CLASS} pr-12`}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7a7a] transition-colors hover:text-[#1d1d1f]"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[14px] text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="confirm_password"
              className="text-[14px] font-normal leading-[1.43] text-[#1d1d1f]"
            >
              Konfirmasi Kata Sandi
            </Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••••"
                aria-invalid={!!errors.confirm_password}
                className={`${AUTH_INPUT_CLASS} pr-12`}
                {...register("confirm_password")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7a7a] transition-colors hover:text-[#1d1d1f]"
                aria-label={showConfirm ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="text-[14px] text-destructive">{errors.confirm_password.message}</p>
            )}
          </div>
        </div>

        <TurnstileWidget onVerify={handleTurnstileVerify} />

        <p className="text-[12px] font-normal leading-relaxed text-[#7a7a7a]">
          Dengan mendaftar, kamu setuju dengan{" "}
          <Link href="/terms" className="text-[#EA5329] underline-offset-2 hover:underline">
            Syarat & Ketentuan
          </Link>{" "}
          dan{" "}
          <Link href="/privacy" className="text-[#EA5329] underline-offset-2 hover:underline">
            Kebijakan Privasi
          </Link>{" "}
          GeekyTech.
        </p>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-lg border-0 bg-[#EA5329] text-[17px] font-normal leading-none text-white shadow-none transition-transform hover:bg-[#d44820] active:scale-[0.95] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A52] disabled:opacity-50"
        >
          {isLoading && <Loader2 size={16} className="mr-2 animate-spin" />}
          Daftar
        </Button>
      </form>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleRegister}
        disabled={isGoogleLoading}
        className="!-mt-4 h-12 w-full rounded-lg border-0 bg-[#1d1d1f] text-[17px] font-normal text-white shadow-none transition-transform hover:bg-[#272729] active:scale-[0.95]"
      >
        {isGoogleLoading ? (
          <Loader2 size={16} className="mr-2 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        Daftar dengan google
      </Button>

      <p className="text-center text-[17px] font-normal leading-[1.47] text-[#1d1d1f]">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#EA5329] underline-offset-4 transition-colors hover:text-[#d44820] hover:underline"
        >
          masuk
        </Link>
      </p>
    </div>
  );
}
