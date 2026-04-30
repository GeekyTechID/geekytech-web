import { createClient } from "@/lib/supabase/server";
import { AnnouncementBarServer } from "@/components/layout/announcement-bar-server";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BottomNavBar } from "@/components/layout/bottom-nav-bar";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { MaintenancePage } from "@/components/layout/maintenance-page";

async function getMaintenanceMode(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();
    return data?.value === true || data?.value === "true";
  } catch {
    return false;
  }
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMaintenance = await getMaintenanceMode();

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AnnouncementBarServer />
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <BottomNavBar />
      <WhatsAppButton />
    </div>
  );
}
