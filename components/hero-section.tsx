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
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center max-w-7xl mx-auto px-2 sm:px-6 py-12 sm:py-20">
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

          {/* Right side - Platform Preview Bento */}
          <div className="relative w-full max-w-md mx-auto overflow-visible pb-16">
            {/* Subtle glow behind composition */}
            <div className="absolute inset-0 bg-indigo-600/20 blur-[100px] rounded-full -z-10 transform translate-x-10 translate-y-10 pointer-events-none" />

            {/* Element A: Main Expert Card */}
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl relative z-10">
              <div className="flex items-center gap-4">
                <img
                  src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop"
                  alt="Expert"
                  className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500 shrink-0"
                />
                <div>
                  <p className="text-white font-semibold">David Chen</p>
                  <p className="text-slate-400 text-sm">VP of Engineering @ TechCorp</p>
                </div>
              </div>
              <div className="w-full h-px bg-slate-800 my-5" />
              <div className="flex flex-col gap-3">
                <p className="text-slate-300 text-sm">💡 1-on-1 Mentorship & Career Guidance</p>
                <p className="text-slate-300 text-sm">💻 Vibe Coding & System Architecture</p>
              </div>
              <button className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all">
                View Full Profile
              </button>
            </div>

            {/* Element B: Live Availability Floating Pill - hidden on small screens to avoid overflow */}
            <div className="absolute -top-6 -right-6 z-20 bg-slate-800 backdrop-blur-md border border-slate-600 rounded-2xl p-4 shadow-xl animate-bounce-slow hidden sm:block">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <div className="text-sm">
                  <p className="text-white font-semibold">Available Now</p>
                  <p className="text-slate-400 text-xs">Replies in &lt; 5 mins</p>
                </div>
              </div>
            </div>

            {/* Element C: Success Metric Floating Card - hidden on small screens to avoid overflow */}
            <div className="absolute -bottom-8 -left-8 z-20 bg-slate-800/90 backdrop-blur-md border border-slate-600 rounded-2xl p-4 shadow-xl hidden sm:block">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 text-amber-500 p-2 rounded-lg">⭐</div>
                <div>
                  <p className="text-white font-bold">5.0 Rating</p>
                  <p className="text-slate-400 text-xs">From 120+ students</p>
                </div>
              </div>
            </div>
          </div>
      </div>
    </section>
  );
}
