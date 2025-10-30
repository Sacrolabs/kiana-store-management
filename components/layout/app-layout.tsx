"use client";

import { BottomNav } from "./bottom-nav";
import { SideNav } from "./side-nav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar for desktop */}
      <SideNav />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-h-screen">
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>

        {/* Bottom navigation for mobile */}
        <BottomNav />
      </div>
    </div>
  );
}
