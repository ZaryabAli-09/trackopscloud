"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Activity,
  Settings,
  BarChart3,
  CreditCard,
  LogOut,
  Shield,
} from "lucide-react";

interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  requiredRole?: "company_admin" | "company_employee";
}

const navigation: NavigationItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Products & Inventory", href: "/dashboard/products", icon: Package },
  { label: "Sales Ledger", href: "/dashboard/sales", icon: ShoppingCart },
  { label: "Customers", href: "/dashboard/customers", icon: Users },
  { label: "Stock Movements", href: "/dashboard/stock-movements", icon: Activity },
  { label: "Employees", href: "/dashboard/employees", icon: Shield, requiredRole: "company_admin" },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { label: "Company Settings", href: "/dashboard/settings", icon: Settings, requiredRole: "company_admin" },
];

interface SidebarProps {
  userRole: string;
  userName: string;
  companyName: string;
  onLogout: () => void;
}

export function Sidebar({ userRole, userName, companyName, onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r border-muted/50 flex flex-col z-50">
      <div className="h-16 border-b border-muted/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
            T
          </div>
          <span className="font-semibold text-lg">TrackOpsCloud</span>
        </div>
        <div className="text-xs text-muted-foreground">{companyName}</div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navigation
          .filter((item) => {
            if (item.requiredRole === "company_admin" && userRole !== "company_admin" && userRole !== "platform_admin") {
              return false;
            }
            return true;
          })
          .map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="p-4 border-t border-muted/50">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}