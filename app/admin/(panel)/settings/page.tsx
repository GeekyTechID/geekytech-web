import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SettingsNav } from "./_components/settings-nav";
import { MaintenanceToggle } from "./_components/maintenance-toggle";
import { AnnouncementForm } from "./_components/announcement-form";
import { WhatsappForm } from "./_components/whatsapp-form";
import { AutoCompleteForm } from "./_components/auto-complete-form";

export const metadata: Metadata = { title: "Pengaturan — Admin GeekyTech" };
export const dynamic = "force-dynamic";

type SettingRow = { key: string; value: unknown };

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["maintenance_mode", "announcement_bar", "whatsapp_cs", "auto_complete_days"]);

  const get = (key: string): unknown => rows?.find((r: SettingRow) => r.key === key)?.value;

  const maintenanceMode = (get("maintenance_mode") as boolean) ?? false;
  const announcementBar = (get("announcement_bar") as { text: string; is_active: boolean }) ?? {
    text: "",
    is_active: false,
  };
  const whatsappCs = (get("whatsapp_cs") as string) ?? "";
  const autoCompleteDays = (get("auto_complete_days") as number) ?? 7;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Pengaturan</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Konfigurasi toko GeekyTech</p>
      </div>

      <SettingsNav />

      <div className="space-y-4">
        {/* Maintenance Mode */}
        <div className="border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-xs font-black uppercase tracking-widest">Maintenance Mode</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Aktifkan untuk menonaktifkan akses publik sementara.
            </p>
          </div>
          <div className="p-4">
            <MaintenanceToggle initialValue={maintenanceMode} />
          </div>
        </div>

        {/* Announcement Bar */}
        <div className="border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-xs font-black uppercase tracking-widest">Announcement Bar</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Banner informasi di bagian atas halaman.
            </p>
          </div>
          <div className="p-4">
            <AnnouncementForm
              initialText={announcementBar.text}
              initialActive={announcementBar.is_active}
            />
          </div>
        </div>

        {/* WhatsApp CS */}
        <div className="border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-xs font-black uppercase tracking-widest">WhatsApp CS</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Nomor WhatsApp customer service yang ditampilkan di tombol floating.
            </p>
          </div>
          <div className="p-4">
            <WhatsappForm initialValue={whatsappCs} />
          </div>
        </div>

        {/* Auto Complete */}
        <div className="border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-xs font-black uppercase tracking-widest">Auto Complete Order</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Order otomatis selesai setelah X hari konfirmasi pengiriman.
            </p>
          </div>
          <div className="p-4">
            <AutoCompleteForm initialValue={autoCompleteDays} />
          </div>
        </div>
      </div>
    </div>
  );
}
