"use client";

import { ReactNode, Suspense, useState } from "react";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { DashboardModeProvider } from "@/contexts/dashboard-mode-context";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <DashboardModeProvider>
        <div className="min-h-screen bg-slate-950">
          <Navigation onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
          <div className="pt-16">
            <div className="flex relative">
              {sidebarOpen && (
                <div
                  className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                  onClick={() => setSidebarOpen(false)}
                />
              )}

              <div
                className={`${
                  sidebarOpen ? "translate-x-0" : "-translate-x-full"
                } md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out`}
              >
                <Suspense
                  fallback={
                    <aside className="w-64 border-r border-slate-800 bg-slate-950 min-h-[calc(100vh-4rem)]" />
                  }
                >
                  <DashboardSidebar onClose={() => setSidebarOpen(false)} />
                </Suspense>
              </div>

              <div className="flex-1 flex flex-col min-h-[calc(100vh-4rem)] overflow-y-auto bg-slate-950">
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                  <div className="mx-auto w-full max-w-6xl">{children}</div>
                </main>
                <footer className="w-full border-t border-slate-800/80 py-6 px-6 lg:px-8 mt-auto shrink-0">
                  <div className="mx-auto flex max-w-6xl flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-slate-500">
                      &copy; {new Date().getFullYear()} Sito. All rights reserved.
                    </div>
                    <div className="flex items-center gap-6 text-sm font-medium">
                      <Link href="/support" className="text-slate-500 hover:text-slate-200 transition-colors">
                        Support
                      </Link>
                      <Link href="/terms" className="text-slate-500 hover:text-slate-200 transition-colors">
                        Terms
                      </Link>
                      <Link href="/privacy" className="text-slate-500 hover:text-slate-200 transition-colors">
                        Privacy
                      </Link>
                    </div>
                  </div>
                </footer>
              </div>
            </div>
          </div>
        </div>
      </DashboardModeProvider>
    </ProtectedRoute>
  );
}
