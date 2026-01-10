"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter, usePathname } from "next/navigation";

export function Navigation({ onSidebarToggle }: { onSidebarToggle?: () => void }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardMenuOpen, setDashboardMenuOpen] = useState(false);
  
  // Check if we're on a dashboard page (all pages that use DashboardLayout)
  const isDashboardPage = pathname?.startsWith("/dashboard") || 
                          pathname?.startsWith("/profile") || 
                          pathname?.startsWith("/products") || 
                          pathname?.startsWith("/messages") || 
                          pathname?.startsWith("/connections") || 
                          pathname?.startsWith("/subscriptions") || 
                          pathname?.startsWith("/courses/manage") || 
                          pathname?.startsWith("/courses/create") ||
                          pathname?.startsWith("/appointments/manage") ||
                          pathname?.startsWith("/appointments/book") ||
                          pathname?.startsWith("/blog/create") ||
                          pathname?.startsWith("/blog/edit") ||
                          pathname === "/blog/watch-later" ||
                          pathname?.startsWith("/questionnaires/manage") ||
                          pathname === "/admin";

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
    setMobileMenuOpen(false);
    setDashboardMenuOpen(false);
  };

  const handleSidebarToggle = () => {
    if (onSidebarToggle) {
      onSidebarToggle();
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-custom-bg/95 backdrop-blur-lg border-b border-cyber-green/30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 relative">
          {/* Left side: Hamburger menu (dashboard pages) or empty space */}
          <div className="flex items-center w-12 md:w-auto flex-shrink-0">
            {isDashboardPage && user ? (
              <button
                onClick={handleSidebarToggle}
                className="md:hidden text-custom-text hover:text-cyber-green transition-colors p-2 -ml-2"
                aria-label="Toggle sidebar"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            ) : (
              <div className="md:hidden w-12"></div>
            )}
          </div>
          
          {/* Center: Logo - always centered */}
          <Link
            href="/"
            className="absolute left-1/2 transform -translate-x-1/2 text-xl sm:text-2xl font-bold text-cyber-green hover:text-cyber-green-light transition-colors duration-300 text-glow"
          >
            Sito
          </Link>
          

          {/* Right side: Desktop nav, dashboard menu dropdown, or mobile menu button */}
          <div className="flex items-center justify-end flex-shrink-0 relative">
            {/* Desktop Navigation - always visible on desktop */}
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              {isDashboardPage ? (
                // Dashboard pages: Show dropdown menu button
                <div className="relative">
                  <button
                    onClick={() => setDashboardMenuOpen(!dashboardMenuOpen)}
                    className="text-custom-text/90 hover:text-custom-text transition-all duration-300 relative group text-sm lg:text-base flex items-center gap-1"
                    aria-label="Toggle navigation menu"
                  >
                    <span>Menu</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${dashboardMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyber-green group-hover:w-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,136,0.5)]"></span>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {dashboardMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-dark-green-800/95 backdrop-blur-sm border border-cyber-green/30 rounded-lg shadow-lg z-50 py-2">
                      <Link
                        href="/directory"
                        onClick={() => setDashboardMenuOpen(false)}
                        className="block px-4 py-2 text-custom-text/90 hover:text-cyber-green hover:bg-dark-green-900/50 transition-colors text-sm"
                      >
                        Featured Experts
                      </Link>
                      <Link
                        href="/featured-courses"
                        onClick={() => setDashboardMenuOpen(false)}
                        className="block px-4 py-2 text-custom-text/90 hover:text-cyber-green hover:bg-dark-green-900/50 transition-colors text-sm"
                      >
                        Featured Learnings
                      </Link>
                      <Link
                        href="/blog"
                        onClick={() => setDashboardMenuOpen(false)}
                        className="block px-4 py-2 text-custom-text/90 hover:text-cyber-green hover:bg-dark-green-900/50 transition-colors text-sm"
                      >
                        Experts Sharing
                      </Link>
                      {user && (
                        <Link
                          href="/dashboard"
                          onClick={() => setDashboardMenuOpen(false)}
                          className="block px-4 py-2 text-custom-text/90 hover:text-cyber-green hover:bg-dark-green-900/50 transition-colors text-sm border-t border-cyber-green/20 mt-1 pt-2"
                        >
                          Dashboard
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Non-dashboard pages: Show full navigation
                <>
                  <Link
                    href="/directory"
                    className="text-custom-text/90 hover:text-custom-text transition-all duration-300 relative group text-sm lg:text-base"
                  >
                    Featured Experts
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyber-green group-hover:w-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,136,0.5)]"></span>
                  </Link>
                  <Link
                    href="/featured-courses"
                    className="text-custom-text/90 hover:text-custom-text transition-all duration-300 relative group text-sm lg:text-base"
                  >
                    Featured Learnings
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyber-green group-hover:w-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,136,0.5)]"></span>
                  </Link>
                  <Link
                    href="/blog"
                    className="text-custom-text/90 hover:text-custom-text transition-all duration-300 relative group text-sm lg:text-base"
                  >
                    Experts Sharing
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyber-green group-hover:w-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,136,0.5)]"></span>
                  </Link>
                  {loading ? (
                    <div className="text-custom-text/80 animate-pulse text-sm lg:text-base">Loading...</div>
                  ) : user ? (
                    <Link
                      href="/dashboard"
                      className="text-custom-text/90 hover:text-custom-text transition-all duration-300 relative group text-sm lg:text-base"
                    >
                      Dashboard
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyber-green group-hover:w-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,136,0.5)]"></span>
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="text-custom-text/90 hover:text-custom-text transition-all duration-300 relative group text-sm lg:text-base"
                      >
                        Sign In
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyber-green group-hover:w-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,136,0.5)]"></span>
                      </Link>
                      <Link
                        href="/register"
                        className="bg-cyber-green text-custom-text px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-cyber-green-light transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg animate-pulse-glow font-bold text-sm lg:text-base"
                      >
                        Get Started
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
            
            {/* Mobile menu button (non-dashboard pages only) */}
            {!isDashboardPage && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-custom-text hover:text-cyber-green transition-colors p-2 -mr-2"
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {mobileMenuOpen ? (
                    <path d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Click outside to close dashboard menu */}
        {dashboardMenuOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDashboardMenuOpen(false)}
          />
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-cyber-green/30 bg-dark-green-800/50 backdrop-blur-sm">
            <div className="px-4 py-4 space-y-4">
              <Link
                href="/directory"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-custom-text/90 hover:text-cyber-green transition-colors py-2"
              >
                Featured Experts
              </Link>
              <Link
                href="/featured-courses"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-custom-text/90 hover:text-cyber-green transition-colors py-2"
              >
                Featured Learnings
              </Link>
              <Link
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-custom-text/90 hover:text-cyber-green transition-colors py-2"
              >
                Experts Sharing
              </Link>
              {loading ? (
                <div className="text-custom-text/80 animate-pulse py-2">Loading...</div>
              ) : user ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-custom-text/90 hover:text-cyber-green transition-colors py-2"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-custom-text/90 hover:text-cyber-green transition-colors py-2"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block bg-cyber-green text-custom-text px-4 py-2 rounded-lg hover:bg-cyber-green-light transition-all duration-300 text-center font-bold mt-2"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

