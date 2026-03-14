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
                          pathname?.startsWith("/appointments") ||
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
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 relative">
          {/* Left side: Logo (desktop) or Hamburger menu (mobile dashboard pages) */}
          <div className="flex items-center flex-shrink-0">
            {/* Mobile: Hamburger menu for dashboard pages */}
            {isDashboardPage && user ? (
              <button
                onClick={handleSidebarToggle}
                className="md:hidden text-white hover:text-white/80 transition-colors p-2 -ml-2"
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
            
            {/* Desktop: Logo on left */}
            <Link
              href="/"
              className="hidden md:block text-xl sm:text-2xl font-bold text-white hover:text-white/80 transition-colors duration-300"
            >
              Sito
            </Link>
            
            {/* Mobile: Logo centered */}
            <Link
              href="/"
              className="md:hidden absolute left-1/2 transform -translate-x-1/2 text-xl sm:text-2xl font-bold text-white hover:text-white/80 transition-colors duration-300"
            >
              Sito
            </Link>
          </div>
          

          {/* Right side: Desktop nav (expanded) or mobile menu button */}
          <div className="flex items-center justify-end flex-shrink-0 relative">
            {/* Desktop Navigation - always expanded on desktop */}
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <Link
                href="/directory"
                className="text-white/90 hover:text-text-primary transition-all duration-300 relative group text-sm lg:text-base"
              >
                Featured Experts
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link
                href="/featured-courses"
                className="text-white/90 hover:text-text-primary transition-all duration-300 relative group text-sm lg:text-base"
              >
                Secret Recipe
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link
                href="/blog"
                className="text-white/90 hover:text-text-primary transition-all duration-300 relative group text-sm lg:text-base"
              >
                Experts Sharing
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
              </Link>
              {loading ? (
                <div className="text-text-secondary animate-pulse text-sm lg:text-base">Loading...</div>
              ) : user ? (
                <>
                  <Link
                    href="/profile"
                    className="text-white/90 hover:text-text-primary transition-all duration-300 relative group text-sm lg:text-base"
                  >
                    Dashboard
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-red-400 hover:text-red-300 transition-all duration-300 text-sm lg:text-base font-medium"
                    title="Sign Out"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-white/90 hover:text-text-primary transition-all duration-300 relative group text-sm lg:text-base"
                  >
                    Sign In
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
                  </Link>
                  <Link
                    href="/register"
                    className="bg-primary text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-gray-200 transition-all duration-300 font-medium text-sm lg:text-base"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
            
            {/* Mobile: Menu button for dashboard pages (top right) */}
            {isDashboardPage && user && (
              <div className="md:hidden relative z-50">
                <button
                  onClick={() => setDashboardMenuOpen(!dashboardMenuOpen)}
                  className="text-custom-text hover:text-cyber-green transition-colors p-2 -mr-2 bg-surface rounded-md border border-border-default"
                  aria-label="Toggle navigation menu"
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
                    <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                
                {/* Mobile Dropdown Menu */}
                {dashboardMenuOpen && (
                  <>
                    <div className="absolute right-0 mt-2 w-56 bg-surface backdrop-blur-sm border border-border-default rounded-md shadow-2xl z-50 py-2">
                      <Link
                        href="/directory"
                        onClick={() => setDashboardMenuOpen(false)}
                        className="block px-4 py-3 text-white/90 hover:text-primary hover:bg-surface/80 transition-colors text-sm font-medium"
                      >
                        Featured Experts
                      </Link>
                      <Link
                        href="/featured-courses"
                        onClick={() => setDashboardMenuOpen(false)}
                        className="block px-4 py-3 text-white/90 hover:text-primary hover:bg-surface/80 transition-colors text-sm font-medium"
                      >
                        Secret Recipe
                      </Link>
                      <Link
                        href="/blog"
                        onClick={() => setDashboardMenuOpen(false)}
                        className="block px-4 py-3 text-white/90 hover:text-primary hover:bg-surface/80 transition-colors text-sm font-medium"
                      >
                        Experts Sharing
                      </Link>
                      {user && (
                        <>
                          <Link
                            href="/profile"
                            onClick={() => setDashboardMenuOpen(false)}
                            className="block px-4 py-3 text-white/90 hover:text-primary hover:bg-surface/80 transition-colors text-sm font-medium border-t border-border-default mt-1 pt-3"
                          >
                            Dashboard
                          </Link>
                          <button
                            onClick={() => {
                              handleSignOut();
                              setDashboardMenuOpen(false);
                            }}
                            className="block w-full text-left px-4 py-3 text-red-400 hover:text-red-300 hover:bg-surface/80 transition-colors text-sm font-medium border-t border-border-default"
                          >
                            Sign Out
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            
            {/* Mobile menu button (non-dashboard pages only) */}
            {!isDashboardPage && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-text-primary hover:text-primary transition-colors p-2 -mr-2"
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
            className="fixed inset-0 z-30"
            onClick={() => setDashboardMenuOpen(false)}
          />
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border-default bg-surface backdrop-blur-sm">
            <div className="px-4 py-4 space-y-4">
              <Link
                href="/directory"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-white/90 hover:text-primary transition-colors py-2"
              >
                Featured Experts
              </Link>
              <Link
                href="/featured-courses"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-white/90 hover:text-primary transition-colors py-2"
              >
                Secret Recipe
              </Link>
              <Link
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-white/90 hover:text-primary transition-colors py-2"
              >
                Experts Sharing
              </Link>
              {loading ? (
                <div className="text-text-secondary animate-pulse py-2">Loading...</div>
              ) : user ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-white/90 hover:text-primary transition-colors py-2"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left text-red-400 hover:text-red-300 transition-colors py-2 border-t border-border-default mt-2 pt-4"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-white/90 hover:text-primary transition-colors py-2"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block bg-primary text-white px-4 py-2 rounded-md hover:bg-gray-200 transition-all duration-300 text-center font-medium mt-2"
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

