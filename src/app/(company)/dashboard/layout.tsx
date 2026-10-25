import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { useSession } from "next-auth/react";

export default function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const userRole = session?.user?.role || "";

  return (
    <div className="flex h-screen bg-muted/50">
      <Sidebar
        userRole={userRole}
        userName={userName}
        companyName={session?.user?.companyId || "Company"}
        onLogout={() => {
          if (typeof window !== "undefined") {
            window.location.href = "/api/auth/signout";
          }
        }}
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          onMenuClick={() => {}}
        />
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  );
}