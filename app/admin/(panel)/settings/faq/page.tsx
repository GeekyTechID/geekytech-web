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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/settings"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={14} />
            Pengaturan
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-black uppercase tracking-tight">Kelola FAQ</h1>
        </div>
        <Link
          href="/admin/settings/faq/new"
          className="flex items-center gap-2 h-9 px-4 bg-swiss-black text-swiss-white text-xs font-black uppercase tracking-widest transition-opacity"
        >
          <Plus size={14} />
          Tambah FAQ
        </Link>
      </div>

      <SettingsNav />

      <FaqTable faqs={(faqs ?? []) as FaqRow[]} />
    </div>
  );
}
