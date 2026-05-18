import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SettingsNav } from "../_components/settings-nav";
import { OriginForm } from "./_components/origin-form";
import { ThresholdForm } from "./_components/threshold-form";

export const metadata: Metadata = { title: "Pengiriman — Admin GeekyTech" };
export const dynamic = "force-dynamic";

type SettingRow = { key: string; value: unknown };

type StoreOrigin = {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postal_code: string;
  address: string;
};

const DEFAULT_ORIGIN: StoreOrigin = {
  name: "",
  phone: "",
  province: "",
  city: "",
  district: "",
  postal_code: "",
  address: "",
};

export default async function AdminSettingsShippingPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["store_origin", "free_shipping_threshold"]);

  const get = (key: string): unknown => rows?.find((r: SettingRow) => r.key === key)?.value;

  const storeOrigin = (get("store_origin") as StoreOrigin) ?? DEFAULT_ORIGIN;
  const freeShippingThreshold = (get("free_shipping_threshold") as number) ?? 200000;

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
          <h1 className="text-[34px] font-semibold uppercase text-foreground">Pengiriman</h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">
            Alamat origin dan threshold gratis ongkir.
          </p>
        </div>
      </div>

      <SettingsNav />

      <div className="space-y-6">
        <div className="admin-utility-card overflow-hidden p-0">
          <div className="border-b border-[#e0e0e0] px-5 py-4 dark:border-border">
            <h2 className="admin-section-title">Alamat Origin Toko</h2>
            <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">
              Alamat pengirim yang digunakan saat kalkulasi ongkos kirim dan pembuatan pengiriman.
            </p>
          </div>
          <div className="p-6">
            <OriginForm initialValue={storeOrigin} />
          </div>
        </div>

        <div className="admin-utility-card overflow-hidden p-0">
          <div className="border-b border-[#e0e0e0] px-5 py-4 dark:border-border">
            <h2 className="admin-section-title">Threshold Free Ongkir</h2>
            <p className="mt-1 text-[17px] leading-[1.47] text-muted-foreground">
              Pelanggan mendapat gratis ongkir jika total belanja mencapai nominal ini.
            </p>
          </div>
          <div className="p-6">
            <ThresholdForm initialValue={freeShippingThreshold} />
          </div>
        </div>
      </div>
    </div>
  );
}
