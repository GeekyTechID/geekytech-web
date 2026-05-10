"use client";

import { useTransition } from "react";
import { HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AdminTableDeleteButton,
  AdminTableEditLink,
} from "@/components/admin/admin-table-row-actions";
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
    <div className="flex flex-wrap items-center gap-1.5">
      <AdminTableEditLink href={`/admin/settings/faq/${faq.id}/edit`}>Edit</AdminTableEditLink>
      <AdminTableDeleteButton onClick={handleDelete} disabled={isPending}>
        Hapus
      </AdminTableDeleteButton>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "h-7 rounded-md px-2 text-[10px] font-semibold uppercase tracking-widest transition-colors disabled:opacity-50",
          faq.is_active
            ? "bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/25 dark:text-emerald-400"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
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
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-muted-foreground">
        <HelpCircle size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase tracking-widest">Belum ada FAQ</p>
      </div>
    );
  }

  return (
    <div className="admin-utility-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e0e0e0] bg-muted/30 dark:border-border">
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Pertanyaan
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:table-cell">
                Kategori
              </th>
              <th className="hidden w-16 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:table-cell">
                Sort
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0] dark:divide-border">
            {faqs.map((faq) => (
              <tr key={faq.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="line-clamp-2 max-w-xs text-sm font-medium">{faq.question}</p>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {faq.category ? (
                    <span className="text-xs capitalize text-muted-foreground">{faq.category}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="font-mono text-xs text-muted-foreground">{faq.sort_order}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
                      faq.is_active
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground",
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
    </div>
  );
}
