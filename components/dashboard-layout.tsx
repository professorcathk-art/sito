"use client";

import { ReactNode, useState } from "react";
import { Navigation } from "@/components/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ProtectedRoute } from "@/components/protected-route";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-custom-bg">
        <Navigation onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="pt-16 pb-12">
          <div className="flex relative">
            {/* Mobile overlay */}
            {sidebarOpen && (
              <div
                className="md:hidden fixed inset-0 bg-black/50 z-40"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar */}
            <div
              className={`${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              } md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out`}
            >
              <DashboardSidebar onClose={() => setSidebarOpen(false)} />
            </div>

            {/* Main content - full width on mobile */}
            <div className="flex-1 w-full md:w-auto px-4 sm:px-6 lg:px-8 md:px-0">
              {children}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

