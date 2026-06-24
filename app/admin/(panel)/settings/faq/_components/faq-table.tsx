"use client";

import { useTransition } from "react";
import { HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import {
  AdminTableDeleteButton,
  AdminTableEditLink,
} from "@/components/admin/admin-table-row-actions";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
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
      <StatusPillToggle
        active={faq.is_active}
        onToggle={handleToggle}
        activeLabel="Aktif"
        inactiveLabel="Nonaktif"
        disabled={isPending}
        size="compact"
      />
    </div>
  );
}

export function FaqTable({ faqs }: FaqTableProps) {
  if (faqs.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-foreground">
        <HelpCircle size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase">Belum ada FAQ</p>
      </div>
    );
  }

  return (
    <div className="admin-utility-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e0e0e0] bg-muted/30">
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-foreground">
                Pertanyaan
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase text-foreground sm:table-cell">
                Kategori
              </th>
              <th className="hidden w-16 px-4 py-3 text-left text-[10px] font-semibold uppercase text-foreground md:table-cell">
                Sort
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase text-foreground">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0]">
            {faqs.map((faq) => (
              <tr key={faq.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="line-clamp-2 max-w-xs text-sm font-medium">{faq.question}</p>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {faq.category ? (
                    <span className="text-xs capitalize text-foreground">{faq.category}</span>
                  ) : (
                    <span className="text-xs text-foreground">—</span>
                  )}
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="font-mono text-xs text-foreground">{faq.sort_order}</span>
                </td>
                <td className="px-4 py-3">
                  <AdminStatusBadge active={faq.is_active} />
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
