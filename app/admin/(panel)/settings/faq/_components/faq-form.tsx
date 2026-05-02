"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createFaq, updateFaq, type FaqFormData } from "../_actions";

type FaqFormProps = {
  initialData?: {
    id: string;
    question: string;
    answer: string;
    category: string | null;
    sort_order: number;
    is_active: boolean;
  };
};

export function FaqForm({ initialData }: FaqFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [question, setQuestion] = useState(initialData?.question ?? "");
  const [answer, setAnswer] = useState(initialData?.answer ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [sortOrder, setSortOrder] = useState(String(initialData?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) { toast.error("Pertanyaan wajib diisi."); return; }
    if (!answer.trim()) { toast.error("Jawaban wajib diisi."); return; }

    const data: FaqFormData = {
      question: question.trim(),
      answer: answer.trim(),
      category: category.trim(),
      sort_order: parseInt(sortOrder, 10) || 0,
      is_active: isActive,
    };

    startTransition(async () => {
      if (initialData) {
        const { error } = await updateFaq(initialData.id, data);
        if (error) { toast.error(error); return; }
        toast.success("FAQ diperbarui.");
      } else {
        const { error } = await createFaq(data);
        if (error) { toast.error(error); return; }
        toast.success("FAQ berhasil dibuat.");
      }
      router.push("/admin/settings/faq");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border border-border">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-xs font-black uppercase tracking-widest">Detail FAQ</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Pertanyaan *
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Bagaimana cara melakukan pemesanan?"
              rows={2}
              required
              className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none rounded-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Jawaban *
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Jawaban lengkap untuk pertanyaan ini..."
              rows={5}
              required
              className="w-full border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-none rounded-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Kategori
              </label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="pengiriman, pembayaran, retur, dll"
                className="h-9 rounded-none text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Urutan Tampil
              </label>
              <Input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-9 rounded-none text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Status
            </label>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={cn(
                "flex h-9 items-center gap-2 border border-border px-4 text-xs font-bold uppercase tracking-widest transition-colors",
                isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isActive ? "Aktif" : "Nonaktif"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-6 bg-swiss-black text-swiss-white text-xs font-black uppercase tracking-widest transition-opacity disabled:opacity-50"
        >
          {isPending ? "Menyimpan..." : initialData ? "Perbarui FAQ" : "Buat FAQ"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/settings/faq")}
          disabled={isPending}
          className="h-10 px-4 border border-border text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
