"use client";

import { ReactNode } from "react";
import { Navigation } from "@/components/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ProtectedRoute } from "@/components/protected-route";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-custom-bg">
        <Navigation />
        <div className="pt-16 pb-12">
          <div className="flex">
            <DashboardSidebar />
            <div className="flex-1">
              {children}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

