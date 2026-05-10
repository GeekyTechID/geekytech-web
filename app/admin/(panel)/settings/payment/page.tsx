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
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/settings"
          className="admin-text-link inline-flex w-fit items-center gap-1 text-xs font-medium"
        >
          <ChevronLeft size={14} />
          Pengaturan
        </Link>
        <div>
          <p className="text-swiss-eyebrow">Toko</p>
          <h1 className="text-[34px] font-semibold uppercase tracking-[-0.02em] text-foreground">Pembayaran</h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">Batas waktu dan perilaku pembayaran.</p>
        </div>
      </div>

      <SettingsNav />

      <div className="admin-utility-card overflow-hidden p-0">
        <div className="border-b border-[#e0e0e0] px-5 py-4 dark:border-border">
          <h2 className="admin-section-title">Batas Waktu Pembayaran</h2>
          <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">
            Pesanan otomatis dibatalkan jika tidak dibayar dalam X jam.
          </p>
        </div>
        <div className="p-6">
          <TimeoutForm initialValue={paymentTimeoutHours} />
        </div>
      </div>
    </div>
  );
}
