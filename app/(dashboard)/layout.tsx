import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
