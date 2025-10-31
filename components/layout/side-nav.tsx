"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, DollarSign, Users, BarChart3, Receipt, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import { LogoutButton } from "@/components/auth/logout-button";

const navItems = [
  {
    label: "Stores",
    icon: Store,
    href: "/stores",
  },
  {
    label: "Sales",
    icon: DollarSign,
    href: "/sales",
  },
  {
    label: "Staff",
    icon: Users,
    href: "/attendance",
  },
  {
    label: "Expenses",
    icon: Receipt,
    href: "/expenses",
  },
  {
    label: "Reports",
    icon: BarChart3,
    href: "/reports",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export function SideNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav className="hidden md:flex md:flex-col w-64 bg-background border-r min-h-screen">
      {/* Header */}
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold">Store Manager</h1>
        <p className="text-sm text-muted-foreground">Admin Panel</p>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* User Section */}
      {user && (
        <div className="p-4 border-t">
          <div className="mb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">{user.name}</p>
            </div>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      )}
    </nav>
  );
}
