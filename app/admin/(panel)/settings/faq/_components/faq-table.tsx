"use client";

import { useTransition } from "react";
import Link from "next/link";
import { HelpCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleFaqActive, deleteFaq } from "../_actions";

export type FaqRow = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

interface FaqTableProps {
  faqs: FaqRow[];
}

function FaqActions({ faq }: { faq: FaqRow }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      const { error } = await toggleFaqActive(faq.id, !faq.is_active);
      if (error) toast.error(error);
      else toast.success(faq.is_active ? "FAQ dinonaktifkan." : "FAQ diaktifkan.");
    });
  };

  const handleDelete = () => {
    if (!confirm("Hapus FAQ ini? Tindakan tidak bisa dibatalkan.")) return;
    startTransition(async () => {
      const { error } = await deleteFaq(faq.id);
      if (error) toast.error(error);
      else toast.success("FAQ dihapus.");
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/admin/settings/faq/${faq.id}/edit`}
        className="inline-flex p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Edit FAQ"
      >
        <Pencil size={14} />
      </Link>
      <button
        onClick={handleDelete}
        disabled={isPending}
        title="Hapus FAQ"
        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
      >
        <Trash2 size={14} />
      </button>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "h-6 px-2 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50",
          faq.is_active
            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        {faq.is_active ? "Aktif" : "Nonaktif"}
      </button>
    </div>
  );
}

export function FaqTable({ faqs }: FaqTableProps) {
  if (faqs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 border border-dashed border-border py-20 text-muted-foreground">
        <HelpCircle size={36} strokeWidth={1} />
        <p className="text-sm font-bold uppercase tracking-widest">Belum ada FAQ</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Pertanyaan
            </th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:table-cell">
              Kategori
            </th>
            <th className="hidden px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground md:table-cell w-16">
              Sort
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {faqs.map((faq) => (
            <tr
              key={faq.id}
              className="border-b border-border transition-colors last:border-b-0 hover:bg-muted/30"
            >
              <td className="px-4 py-3">
                <p className="text-sm font-medium line-clamp-2 max-w-xs">{faq.question}</p>
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                {faq.category ? (
                  <span className="text-xs text-muted-foreground capitalize">{faq.category}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <span className="text-xs font-mono text-muted-foreground">{faq.sort_order}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                    faq.is_active
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {faq.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </td>
              <td className="px-4 py-3">
                <FaqActions faq={faq} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
