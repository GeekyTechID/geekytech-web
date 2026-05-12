"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { AUTH_INPUT_CLASS } from "@/lib/auth/auth-field-classes";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

const REMEMBER_EMAIL_KEY = "geekytech-login-email";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const urlError = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) {
        setValue("email", saved);
        setRememberMe(true);
      }
    } catch {
      /* ignore */
    }
  }, [setValue]);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const onSubmit = async (values: LoginFormValues) => {
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
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email atau password salah.");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Email belum diverifikasi. Cek inbox kamu.", {
            action: {
              label: "Kirim ulang",
              onClick: () => router.push("/verify-email"),
            },
          });
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Selamat datang kembali!");
      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, values.email.trim());
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      } catch {
        /* ignore */
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${redirectTo}`,
        },
      });
      if (error) toast.error(error.message);
    } catch {
      toast.error("Gagal masuk dengan Google. Coba lagi.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold text-[#1d1d1f]">
          Selamat Datang Kembali!
        </h1>
        <p className="text-[17px] font-normal text-[#1d1d1f]">
          Silahkan masukan detail Anda.
        </p>
      </div>

      {urlError && (
        <div className="rounded-lg border border-destructive/40 bg-white px-4 py-3 text-[14px] leading-[1.43] text-destructive">
          {urlError}
        </div>
      )}

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

        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-[14px] font-normal leading-[1.43] tracking-[-0.014em] text-[#1d1d1f]"
          >
            Kata Sandi
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-normal leading-[1.43] text-[#1d1d1f]">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(v) => setRememberMe(v === true)}
              className="size-[18px] rounded-[4px] border-[#e0e0e0] data-checked:border-[#EA5329] data-checked:bg-[#EA5329]"
            />
            Ingat saya
          </label>
          <Link
            href="/forgot-password"
            className="text-[14px] font-semibold leading-[1.43] tracking-[-0.014em] text-[#1d1d1f] underline-offset-4 transition-colors hover:text-[#EA5329] hover:underline"
          >
            Lupa Kata Sandi
          </Link>
        </div>

        <TurnstileWidget onVerify={handleTurnstileVerify} />

        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-lg border-0 bg-[#EA5329] text-[17px] font-normal leading-none text-white shadow-none transition-transform hover:bg-[#d44820] active:scale-[0.95] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A52] disabled:opacity-50"
        >
          {isLoading && <Loader2 size={16} className="mr-2 animate-spin" />}
          Masuk
        </Button>
      </form>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading}
        className="-mt-10 h-12 w-full rounded-lg border-0 bg-[#1d1d1f] text-[17px] font-normal text-white shadow-none transition-transform hover:bg-[#272729] active:scale-[0.95]"
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
        Masuk dengan google
      </Button>

      <p className="text-center text-[17px] font-normal leading-[1.47] tracking-[-0.022em] text-[#1d1d1f]">
        Tidak punya akun?{" "}
        <Link
          href="/register"
          className="font-semibold text-[#EA5329] underline-offset-4 transition-colors hover:text-[#d44820] hover:underline"
        >
          daftar
        </Link>
      </p>
    </div>
  );
}
