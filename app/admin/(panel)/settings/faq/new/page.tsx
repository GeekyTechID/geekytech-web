import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FaqForm } from "../_components/faq-form";

export const metadata: Metadata = { title: "Tambah FAQ — Admin GeekyTech" };

export default function AdminFaqNewPage() {
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
        <h1 className="text-2xl font-black uppercase tracking-tight">Tambah FAQ</h1>
      </div>

      <FaqForm />
    </div>
  );
}
