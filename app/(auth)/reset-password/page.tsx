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
import { AUTH_INPUT_CLASS } from "@/lib/auth/auth-field-classes";
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
          toast.error("Kata sandi baru tidak boleh sama dengan yang lama.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Kata sandi berhasil diperbarui!");
      await supabase.auth.signOut();
      router.push(
        "/login?message=" +
          encodeURIComponent("Kata sandi berhasil diperbarui. Silakan masuk kembali."),
      );
    } catch {
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-[28px] font-semibold leading-[1.14] text-[#1d1d1f]">
          Buat Kata Sandi Baru
        </h1>
        <p className="text-[17px] font-normal leading-[1.47] text-[#1d1d1f]">
          Pilih kata sandi yang kuat untuk melindungi akunmu.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-[14px] font-normal leading-[1.43] text-[#1d1d1f]"
          >
            Kata Sandi Baru
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Min. 8 karakter, 1 huruf besar, 1 angka"
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
              placeholder="Ulangi kata sandi baru"
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
            <p className="text-[14px] text-destructive">
              {errors.confirm_password.message}
            </p>
          )}
        </div>

        <ul className="space-y-1.5 text-[14px] font-normal leading-[1.43] text-[#7a7a7a]">
          <li className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-[#7a7a7a]" />
            Minimal 8 karakter
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-[#7a7a7a]" />
            Mengandung minimal 1 huruf besar (A–Z)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1 w-1 rounded-full bg-[#7a7a7a]" />
            Mengandung minimal 1 angka (0–9)
          </li>
        </ul>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-lg border-0 bg-[#EA5329] text-[17px] font-normal leading-none text-white shadow-none transition-transform hover:bg-[#d44820] active:scale-[0.95] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF7A52] disabled:opacity-50"
        >
          {isLoading && <Loader2 size={16} className="mr-2 animate-spin" />}
          Simpan Kata Sandi Baru
        </Button>
      </form>
    </div>
  );
}
