"use client";

import { Suspense, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { Button } from "@/components/ui/button";
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const urlError = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const onSubmit = async (values: LoginFormValues) => {
    const hasTurnstile = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
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
    <div className="space-y-8">
      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight uppercase">Masuk</h1>
        <p className="text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Daftar sekarang
          </Link>
        </p>
      </div>

      {/* URL error from OAuth callback */}
      {urlError && (
        <div className="border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {urlError}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Email */}
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

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              Lupa password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              className="h-11 border-foreground/30 focus-visible:border-foreground rounded-none pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Turnstile */}
        <TurnstileWidget onVerify={handleTurnstileVerify} />

        {/* Submit */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-none font-bold uppercase tracking-widest text-sm bg-black text-white hover:bg-black/80"
        >
          {isLoading && <Loader2 size={16} className="animate-spin mr-2" />}
          Masuk
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground uppercase tracking-widest">
          atau
        </span>
        <Separator className="flex-1" />
      </div>

      {/* Google OAuth */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading}
        className="w-full h-11 rounded-none font-semibold border-foreground/30 hover:border-foreground"
      >
        {isGoogleLoading ? (
          <Loader2 size={16} className="animate-spin mr-2" />
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
        Masuk dengan Google
      </Button>
    </div>
  );
}
