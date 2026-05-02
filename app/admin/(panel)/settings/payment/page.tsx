import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SettingsNav } from "../_components/settings-nav";
import { TimeoutForm } from "./_components/timeout-form";

export const metadata: Metadata = { title: "Pembayaran — Admin GeekyTech" };
export const dynamic = "force-dynamic";

type SettingRow = { key: string; value: unknown };

export default async function AdminSettingsPaymentPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["payment_timeout_hours"]);

  const get = (key: string): unknown => rows?.find((r: SettingRow) => r.key === key)?.value;

  const paymentTimeoutHours = (get("payment_timeout_hours") as number) ?? 3;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/settings"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} />
          Pengaturan
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-black uppercase tracking-tight">Pembayaran</h1>
      </div>

      <SettingsNav />

      <div className="space-y-4">
        {/* Payment Timeout */}
        <div className="border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-xs font-black uppercase tracking-widest">Batas Waktu Pembayaran</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pesanan otomatis dibatalkan jika tidak dibayar dalam X jam.
            </p>
          </div>
          <div className="p-4">
            <TimeoutForm initialValue={paymentTimeoutHours} />
          </div>
        </div>
      </div>
    </div>
  );
}
