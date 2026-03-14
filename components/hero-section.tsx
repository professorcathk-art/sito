"use client";

import Link from "next/link";
import { useRef } from "react";
import { useAuth } from "@/contexts/auth-context";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { user } = useAuth();

  return (
    <section
      ref={sectionRef}
      className="pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-20 px-4 sm:px-6 lg:px-8 relative"
    >
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side - Content */}
          <div className="hero-content text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-50 mb-4 sm:mb-6 leading-tight animate-fade-in-up tracking-tight">
              Connect with 100+ Global
              <span className="block text-slate-50 mt-2">Industry Experts</span>
            </h1>
            <p className="text-sm sm:text-lg md:text-xl lg:text-2xl text-slate-400 mb-3 sm:mb-4 lg:mb-5 leading-relaxed animate-fade-in-up px-2 sm:px-0" style={{ animationDelay: "0.2s" }}>
              Find mentors, guides, and advisors to accelerate your career. Learn from the best minds in your industry.
            </p>
            <p className="text-sm sm:text-base md:text-lg text-slate-500 mb-6 sm:mb-8 lg:mb-10 leading-relaxed animate-fade-in-up px-2 sm:px-0" style={{ animationDelay: "0.25s" }}>
              Discover experts who solve your specific problems
            </p>
            {!user && (
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start animate-fade-in-up px-2 sm:px-0" style={{ animationDelay: "0.4s" }}>
                <Link
                  href="/register"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold transition-all duration-300 text-center"
                >
                  Start Now for Free
                </Link>
              </div>
            )}
          </div>

          {/* Right side - Animated Product Story (Glassmorphic UI Cards) */}
          <div className="relative w-full h-[400px] lg:h-[500px] hidden md:block">
            {/* Card 1 - Expert Profile Mockup */}
            <div
              className="absolute top-10 right-10 z-10 w-64 bg-slate-900/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl animate-[float_6s_ease-in-out_infinite]"
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-700/80" />
                <div className="w-full space-y-2">
                  <div className="h-3 bg-slate-700/60 rounded w-3/4 mx-auto" />
                  <div className="h-2 bg-slate-700/40 rounded w-1/2 mx-auto" />
                </div>
                <button className="w-full py-2 px-4 bg-indigo-600/80 text-white text-sm font-medium rounded-lg">
                  Connect
                </button>
              </div>
            </div>

            {/* Card 2 - Mentorship / Booking Mockup */}
            <div
              className="absolute bottom-10 left-10 z-20 w-72 bg-slate-800/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-xl animate-[float_6s_ease-in-out_infinite]"
              style={{ animationDelay: "2s" }}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-600/80" />
                  <div className="flex-1 space-y-1">
                    <div className="h-2.5 bg-slate-600/60 rounded w-24" />
                    <div className="h-2 bg-slate-600/40 rounded w-16" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-slate-700/50 rounded w-full" />
                  <div className="h-2 bg-slate-700/50 rounded w-4/5" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 h-8 bg-slate-700/60 rounded-lg" />
                  <div className="flex-1 h-8 bg-indigo-600/80 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
