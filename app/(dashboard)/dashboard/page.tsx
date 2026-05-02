import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Dashboard
        </p>
        <h1 className="text-4xl font-black uppercase tracking-tight">
          Halo, {user.email}
        </h1>
        <div className="w-12 h-px bg-[#EA5329]" />
        <p className="text-muted-foreground">
          Dashboard sedang disiapkan — FASE 3
        </p>
      </div>
    </div>
  );
}
