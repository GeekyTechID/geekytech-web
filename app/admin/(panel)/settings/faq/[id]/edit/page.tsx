import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FaqForm } from "../../_components/faq-form";

export const metadata: Metadata = { title: "Edit FAQ — Admin GeekyTech" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminFaqEditPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: faq } = await supabase
    .from("faqs")
    .select("id, question, answer, category, sort_order, is_active")
    .eq("id", id)
    .single();

  if (!faq) notFound();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/settings/faq"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
          Kelola FAQ
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-black uppercase tracking-tight">Edit FAQ</h1>
      </div>

      <FaqForm
        initialData={{
          id: faq.id,
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          sort_order: faq.sort_order,
          is_active: faq.is_active,
        }}
      />
    </div>
  );
}
