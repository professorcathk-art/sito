"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";

export function Navigation() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-dark-green-100/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="text-2xl font-bold text-dark-green-800 hover:text-dark-green-700 transition-colors duration-300"
          >
            Sito
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/directory"
              className="text-gray-700 hover:text-dark-green-800 transition-all duration-300 relative group"
            >
              Directory
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-dark-green-700 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/about"
              className="text-gray-700 hover:text-dark-green-800 transition-all duration-300 relative group"
            >
              About
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-dark-green-700 group-hover:w-full transition-all duration-300"></span>
            </Link>
            {loading ? (
              <div className="text-gray-500 animate-pulse">Loading...</div>
            ) : user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-dark-green-800 transition-all duration-300 relative group"
                >
                  Dashboard
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-dark-green-700 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-gray-700 hover:text-dark-green-800 transition-all duration-300 relative group"
                >
                  Sign Out
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-dark-green-700 group-hover:w-full transition-all duration-300"></span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-dark-green-800 transition-all duration-300 relative group"
                >
                  Sign In
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-dark-green-700 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link
                  href="/register"
                  className="bg-dark-green-700 text-white px-4 py-2 rounded-lg hover:bg-dark-green-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

