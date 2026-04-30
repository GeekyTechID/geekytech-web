"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        if (error.message.includes("same password")) {
          toast.error("Password baru tidak boleh sama dengan password lama.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Password berhasil diperbarui!");
      await supabase.auth.signOut();
      router.push("/login?message=Password berhasil diperbarui. Silakan masuk kembali.");
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight uppercase">
          Password Baru
        </h1>
        <p className="text-sm text-muted-foreground">
          Buat password baru untuk akunmu.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest">
            Password Baru
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Min. 8 karakter, 1 huruf besar, 1 angka"
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

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password" className="text-xs font-bold uppercase tracking-widest">
            Konfirmasi Password
          </Label>
          <div className="relative">
            <Input
              id="confirm_password"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Ulangi password baru"
              aria-invalid={!!errors.confirm_password}
              className="h-11 border-foreground/30 focus-visible:border-foreground rounded-none pr-10"
              {...register("confirm_password")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirm ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="text-xs text-destructive">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        {/* Requirements hint */}
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span className="w-1 h-1 bg-muted-foreground rounded-full inline-block" />
            Minimal 8 karakter
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-1 h-1 bg-muted-foreground rounded-full inline-block" />
            Mengandung minimal 1 huruf besar (A-Z)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-1 h-1 bg-muted-foreground rounded-full inline-block" />
            Mengandung minimal 1 angka (0-9)
          </li>
        </ul>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-none font-bold uppercase tracking-widest text-sm bg-black text-white hover:bg-black/80"
        >
          {isLoading && <Loader2 size={16} className="animate-spin mr-2" />}
          Simpan Password Baru
        </Button>
      </form>
    </div>
  );
}
