"use client";

import Link from "next/link";
import { useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ParticleNetwork } from "@/components/particle-network";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { user } = useAuth();

  return (
    <section
      ref={sectionRef}
      className="pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-20 px-4 sm:px-6 lg:px-8 relative"
    >
      <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 max-w-7xl mx-auto px-6 py-12 lg:py-20">
        {/* Right on desktop, above on mobile - Particle Network */}
        <div className="order-1 lg:order-2 w-full lg:w-1/2 h-[250px] sm:h-[300px] lg:h-[500px] relative">
          <div className="absolute inset-0 bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none" />
          <ParticleNetwork />
        </div>

        {/* Left on desktop, below on mobile - Hero content */}
        <div className="order-2 lg:order-1 w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
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
      </div>
    </section>
  );
}
