"use client";

import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import { useSession } from "next-auth/react";
import { Role } from "@/types";

export default function CompanyDashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = (useSession() as { data: { user?: { name?: string | null; email?: string | null; role?: string | null; companyId?: string | null } } | null }) || { data: null };

  const user = session?.user as { name?: string | null; email?: string | null; role?: Role | null; companyId?: string | null } | undefined;

  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const userRole = user?.role || "";

  return (
    <div className="flex h-screen bg-muted/50">
      <Sidebar
        userRole={userRole}
        userName={userName}
        companyName={user?.companyId || "Company"}
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