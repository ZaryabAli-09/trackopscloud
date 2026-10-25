import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { getValidatedViewer } from "@/lib/auth/guard";

export default async function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getValidatedViewer();
  if (!viewer) redirect("/login");
  if (viewer.role === "platform_admin") redirect("/platform-admin");
  return <DashboardShell viewer={viewer}>{children}</DashboardShell>;
}
