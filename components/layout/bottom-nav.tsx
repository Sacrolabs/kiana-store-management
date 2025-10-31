"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, DollarSign, Users, BarChart3, Receipt, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import { LogoutButton } from "@/components/auth/logout-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-bottom md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors tap-highlight-none active:bg-accent",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* User Menu */}
        {user && (
          <Sheet>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors tap-highlight-none active:bg-accent text-muted-foreground hover:text-foreground"
                )}
              >
                <User className="h-5 w-5" />
                <span className="text-xs font-medium">Profile</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader>
                <SheetTitle>Profile</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
                <LogoutButton />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
