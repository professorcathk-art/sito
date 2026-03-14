"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
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
        <div className="pt-16">
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

            {/* Main content - flex column to push footer to bottom */}
            <div className="flex-1 flex flex-col min-h-[calc(100vh-4rem)] overflow-y-auto bg-[#0B0F19]">
              <main className="flex-1 p-6 lg:p-8">{children}</main>
              <footer className="w-full border-t border-slate-800/60 py-6 px-6 lg:px-8 mt-auto shrink-0">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-slate-500">
                    &copy; {new Date().getFullYear()} Sito. All rights reserved.
                  </div>
                  <div className="flex items-center gap-6 text-sm font-medium">
                    <Link href="/support" className="text-slate-500 hover:text-slate-300 transition-colors duration-200">
                      Support
                    </Link>
                    <Link href="/terms" className="text-slate-500 hover:text-slate-300 transition-colors duration-200">
                      Terms
                    </Link>
                    <Link href="/privacy" className="text-slate-500 hover:text-slate-300 transition-colors duration-200">
                      Privacy
                    </Link>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

