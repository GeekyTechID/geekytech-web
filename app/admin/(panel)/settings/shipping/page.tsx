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
        <h1 className="text-2xl font-black uppercase tracking-tight">Pengiriman</h1>
      </div>

      <SettingsNav />

      <div className="space-y-4">
        {/* Store Origin */}
        <div className="border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-xs font-black uppercase tracking-widest">Alamat Origin Toko</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Alamat pengirim yang digunakan saat kalkulasi ongkos kirim dan pembuatan pengiriman.
            </p>
          </div>
          <div className="p-4">
            <OriginForm initialValue={storeOrigin} />
          </div>
        </div>

        {/* Free Shipping Threshold */}
        <div className="border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-xs font-black uppercase tracking-widest">Threshold Free Ongkir</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pelanggan mendapat gratis ongkir jika total belanja mencapai nominal ini.
            </p>
          </div>
          <div className="p-4">
            <ThresholdForm initialValue={freeShippingThreshold} />
          </div>
        </div>
      </div>
    </div>
  );
}
