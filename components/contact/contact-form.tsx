"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const contactFormSchema = z.object({
  name: z
    .string()
    .min(3, "Nama minimal 3 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: z.string().email("Email tidak valid"),
  phone: z
    .string()
    .min(10, "Nomor telepon minimal 10 digit")
    .regex(/^(\+62|0)[0-9]{9,}$/, "Format nomor telepon tidak valid"),
  subject: z
    .string()
    .min(5, "Subjek minimal 5 karakter")
    .max(100, "Subjek maksimal 100 karakter"),
  message: z
    .string()
    .min(10, "Pesan minimal 10 karakter")
    .max(2000, "Pesan maksimal 2000 karakter"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setSubmitted(true);
        reset();
        setTimeout(() => setSubmitted(false), 5000);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-[#f5f5f7] dark:bg-[#2a2a2c] rounded-[18px] p-8 text-center">
        <div className="mb-4 text-4xl">✓</div>
        <h3 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white mb-2">
          Pesan terkirim!
        </h3>
        <p className="text-[14px] text-[#7a7a7a] dark:text-[#cccccc]">
          Terima kasih telah menghubungi kami. Tim kami akan merespon dalam waktu singkat.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-[14px] font-semibold text-[#1d1d1f] dark:text-white mb-2">
          Nama Lengkap
        </label>
        <input
          id="name"
          type="text"
          placeholder="John Doe"
          {...register("name")}
          className="w-full px-4 py-3 rounded-[11px] border border-[#e0e0e0] dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:border-[#EA5329] transition-colors"
        />
        {errors.name && (
          <p className="text-[12px] text-[#d32f2f] mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-[14px] font-semibold text-[#1d1d1f] dark:text-white mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          placeholder="john@example.com"
          {...register("email")}
          className="w-full px-4 py-3 rounded-[11px] border border-[#e0e0e0] dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:border-[#EA5329] transition-colors"
        />
        {errors.email && (
          <p className="text-[12px] text-[#d32f2f] mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-[14px] font-semibold text-[#1d1d1f] dark:text-white mb-2">
          Nomor Telepon
        </label>
        <input
          id="phone"
          type="tel"
          placeholder="08123456789 atau +62123456789"
          {...register("phone")}
          className="w-full px-4 py-3 rounded-[11px] border border-[#e0e0e0] dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:border-[#EA5329] transition-colors"
        />
        {errors.phone && (
          <p className="text-[12px] text-[#d32f2f] mt-1">{errors.phone.message}</p>
        )}
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-[14px] font-semibold text-[#1d1d1f] dark:text-white mb-2">
          Subjek
        </label>
        <input
          id="subject"
          type="text"
          placeholder="Konsultasi produk, pertanyaan pesanan, dll"
          {...register("subject")}
          className="w-full px-4 py-3 rounded-[11px] border border-[#e0e0e0] dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:border-[#EA5329] transition-colors"
        />
        {errors.subject && (
          <p className="text-[12px] text-[#d32f2f] mt-1">{errors.subject.message}</p>
        )}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-[14px] font-semibold text-[#1d1d1f] dark:text-white mb-2">
          Pesan
        </label>
        <textarea
          id="message"
          placeholder="Tulis pesan detailmu di sini..."
          rows={5}
          {...register("message")}
          className="w-full px-4 py-3 rounded-[11px] border border-[#e0e0e0] dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] text-[#1d1d1f] dark:text-white text-[14px] focus:outline-none focus:border-[#EA5329] transition-colors resize-none"
        />
        {errors.message && (
          <p className="text-[12px] text-[#d32f2f] mt-1">{errors.message.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <Button type="submit" variant="primary" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Mengirim...
          </>
        ) : (
          "Kirim Pesan"
        )}
      </Button>

      <p className="text-[12px] text-[#7a7a7a] dark:text-[#cccccc] text-center">
        Kami akan merespon dalam waktu 1-24 jam kerja.
      </p>
    </form>
  );
}
