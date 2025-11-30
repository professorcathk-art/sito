"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

export function Navigation() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
    setMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-custom-bg/95 backdrop-blur-lg border-b border-cyber-green/30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <Link
            href="/"
            className="text-xl sm:text-2xl font-bold text-cyber-green hover:text-cyber-green-light transition-colors duration-300 text-glow"
          >
            Sito
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            <Link
              href="/directory"
              className="text-custom-text/90 hover:text-custom-text transition-all duration-300 relative group text-sm lg:text-base"
            >
              Find Experts
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyber-green group-hover:w-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,136,0.5)]"></span>
            </Link>
            <Link
              href="/about"
              className="text-custom-text/90 hover:text-custom-text transition-all duration-300 relative group text-sm lg:text-base"
            >
              About
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyber-green group-hover:w-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,136,0.5)]"></span>
            </Link>
            <a
              href="https://tenthproject.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-custom-text/90 hover:text-custom-text transition-all duration-300 relative group text-sm lg:text-base"
            >
              Certified Courses
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyber-green group-hover:w-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,136,0.5)]"></span>
            </a>
            {loading ? (
              <div className="text-custom-text/80 animate-pulse text-sm lg:text-base">Loading...</div>
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-custom-text/90 hover:text-custom-text transition-all duration-300 relative group text-sm lg:text-base"
                >
                  Dashboard
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyber-green group-hover:w-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,136,0.5)]"></span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-custom-text/90 hover:text-custom-text transition-all duration-300 relative group text-sm lg:text-base"
                >
                  Sign Out
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyber-green group-hover:w-full transition-all duration-300 shadow-[0_0_10px_rgba(0,255,136,0.5)]"></span>
                </button>
              </>
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
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-custom-text hover:text-cyber-green transition-colors p-2"
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
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-cyber-green/30 bg-dark-green-800/50 backdrop-blur-sm">
            <div className="px-4 py-4 space-y-4">
              <Link
                href="/directory"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-custom-text/90 hover:text-cyber-green transition-colors py-2"
              >
                Find Experts
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-custom-text/90 hover:text-cyber-green transition-colors py-2"
              >
                About
              </Link>
              <a
                href="https://tenthproject.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-custom-text/90 hover:text-cyber-green transition-colors py-2"
              >
                Certified Courses
              </a>
              {loading ? (
                <div className="text-custom-text/80 animate-pulse py-2">Loading...</div>
              ) : user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-custom-text/90 hover:text-cyber-green transition-colors py-2"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left text-custom-text/90 hover:text-cyber-green transition-colors py-2"
                  >
                    Sign Out
                  </button>
                </>
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

