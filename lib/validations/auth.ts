import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
  password: z.string().min(1, { message: "Password wajib diisi" }),
});

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(2, { message: "Nama minimal 2 karakter" })
      .max(100, { message: "Nama maksimal 100 karakter" }),
    email: z.string().email({ message: "Email tidak valid" }),
    password: z
      .string()
      .min(8, { message: "Password minimal 8 karakter" })
      .regex(/[A-Z]/, { message: "Password harus mengandung huruf besar" })
      .regex(/[0-9]/, { message: "Password harus mengandung angka" }),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirm_password"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "Password minimal 8 karakter" })
      .regex(/[A-Z]/, { message: "Password harus mengandung huruf besar" })
      .regex(/[0-9]/, { message: "Password harus mengandung angka" }),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirm_password"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
