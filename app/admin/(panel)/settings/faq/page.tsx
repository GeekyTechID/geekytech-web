import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SettingsNav } from "../_components/settings-nav";
import { FaqTable, type FaqRow } from "./_components/faq-table";

export const metadata: Metadata = { title: "Kelola FAQ — Admin GeekyTech" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsFaqPage() {
  const supabase = await createClient();

  const { data: faqs } = await supabase
    .from("faqs")
    .select("id, question, answer, category, sort_order, is_active, created_at")
    .order("sort_order", { ascending: true })
    .order("question", { ascending: true });

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/settings"
            className="admin-text-link mb-2 inline-flex items-center gap-1 text-xs font-medium"
          >
            <ChevronLeft size={14} />
            Pengaturan
          </Link>
          <p className="text-swiss-eyebrow">Toko</p>
          <h1 className="text-[34px] font-semibold uppercase text-foreground">Kelola FAQ</h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">Pertanyaan yang sering diajukan pelanggan.</p>
        </div>
        <Link
          href="/admin/settings/faq/new"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-5 text-xs font-semibold uppercase text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          <Plus size={14} strokeWidth={2} />
          Tambah FAQ
        </Link>
      </div>

      <SettingsNav />

      <FaqTable faqs={(faqs ?? []) as FaqRow[]} />
    </div>
  );
}
