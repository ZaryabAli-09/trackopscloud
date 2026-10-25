import Link from "next/link";
import { useSession } from "next-auth/react";
import { LogOut, LayoutDashboard, Building, Users as UsersIcon, Shield } from "lucide-react";
import { Role } from "@/types";

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  const user = session?.user as { name?: string | null; email?: string | null; role?: Role | null };

  const userName = user.name || "Admin";
  const userEmail = user.email || "";
  const userRole = user.role || "";

  const navItems = [
    { label: "Overview", href: "/platform-admin", icon: LayoutDashboard },
    { label: "Companies", href: "/platform-admin/companies", icon: Building },
    { label: "Users", href: "/platform-admin/users", icon: UsersIcon },
    { label: "Audit Logs", href: "/platform-admin/audit-logs", icon: Shield },
  ];

  return (
    <div className="flex h-screen bg-muted/50">
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-muted/50 flex flex-col z-50">
        <div className="h-16 border-b border-muted/50 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              T
            </div>
            <span className="font-semibold text-lg">TrackOpsCloud</span>
          </div>
          <span className="text-xs font-semibold text-primary">Platform Admin</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-muted/50">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/api/auth/signout";
              }
            }}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-muted/50 flex items-center justify-between px-6 bg-background sticky top-0 z-40">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Platform Admin</h1>
            <p className="text-xs text-muted-foreground">TrackOpsCloud platform administration</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{userName}</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{userRole}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  );
}