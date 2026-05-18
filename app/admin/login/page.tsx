"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteLogo } from "@/components/shared/site-logo";

function AdminLoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "not_admin") {
      toast.error("Akses ditolak. Akun ini bukan admin.");
    }
  }, [searchParams]);

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      const json = (await res.json()) as { success: boolean; error?: string };

      if (!json.success) {
        toast.error(json.error ?? "Login gagal.");
        return;
      }

      toast.success("Selamat datang di Admin Panel.");
      window.location.href = "/admin";
    } catch {
      toast.error("Terjadi kesalahan tidak terduga. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10">
        {/* Logo + badge */}
        <div className="space-y-5">
          <SiteLogo variant="adminLogin" />

          <div className="flex items-center gap-2 border border-border px-3 py-2 w-fit">
            <ShieldCheck size={14} className="text-[#EA5329]" />
            <span className="text-xs font-bold uppercase text-muted-foreground">
              Admin Panel
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-black uppercase leading-tight">
              Masuk ke
              <br />
              <span className="text-[#EA5329]">Admin Panel</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Akses terbatas untuk administrator.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-bold uppercase"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@geekytech.com"
              aria-invalid={!!errors.email}
              className="h-11 rounded-none border-foreground/30 focus-visible:border-foreground"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-xs font-bold uppercase"
            >
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                className="h-11 rounded-none border-foreground/30 focus-visible:border-foreground pr-10"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-swiss"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-none font-bold uppercase text-sm bg-[#EA5329] hover:bg-[#D44820] text-white border-0"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Memproses...
              </>
            ) : (
              "Masuk"
            )}
          </Button>
        </form>

        <div className="border-t border-border pt-5 text-center">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-swiss underline-offset-4 hover:underline"
          >
            ← Kembali ke website
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginContent />
    </Suspense>
  );
}
