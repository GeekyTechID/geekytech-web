import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SettingsNav } from "../_components/settings-nav";
import { CourierForm } from "./_components/courier-form";
import { fetchAllBiteshipCouriers } from "@/lib/biteship/fetch-active-couriers";
import type { ActiveCourier } from "./_components/courier-form";

export const metadata: Metadata = { title: "Kurir — Admin GeekyTech" };
export const dynamic = "force-dynamic";

type SettingRow = { key: string; value: unknown };

export default async function AdminSettingsCouriersPage() {
  const [allCouriers, supabase] = await Promise.all([
    fetchAllBiteshipCouriers(),
    createClient(),
  ]);

  const { data: rows } = await supabase
    .from("settings")
    .select("key, value")
    .eq("key", "active_couriers");

  const raw = rows?.find((r: SettingRow) => r.key === "active_couriers")?.value;
  const activeCouriers: ActiveCourier[] = Array.isArray(raw) ? (raw as ActiveCourier[]) : [];

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <div>
        <p className="text-swiss-eyebrow">Toko</p>
        <h1 className="text-[34px] font-semibold uppercase text-foreground">Kurir</h1>
        <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
          Pilih kurir dan layanan yang tersedia untuk pelanggan saat checkout.
        </p>
      </div>

      <SettingsNav />

      <div className="admin-utility-card overflow-hidden p-0">
        <div className="border-b border-[#e0e0e0] px-5 py-4 dark:border-border">
          <h2 className="admin-section-title">Kurir Aktif</h2>
          <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
            Centang layanan kurir yang ingin ditampilkan di halaman checkout.
          </p>
        </div>
        <div className="p-6">
          {allCouriers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tidak dapat memuat daftar kurir dari Biteship. Periksa koneksi atau API key.
            </p>
          ) : (
            <CourierForm allCouriers={allCouriers} activeCouriers={activeCouriers} />
          )}
        </div>
      </div>
    </div>
  );
}
