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
      className="pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      {/* Ambient Glow Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] ambient-glow opacity-50"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] ambient-glow opacity-30" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side - Content */}
          <div className="hero-content text-center lg:text-left max-w-2xl mx-auto lg:mx-0 order-2 lg:order-1">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight animate-fade-in-up tracking-tight">
              Connect with 100+ Global
              <span className="block text-white mt-2">
                Industry Experts
              </span>
            </h1>
            <p className="text-sm sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-3 sm:mb-4 lg:mb-5 leading-relaxed animate-fade-in-up px-2 sm:px-0" style={{ animationDelay: '0.2s' }}>
              Find mentors, guides, and advisors to accelerate your career. Learn from the best minds
              in your industry.
            </p>
            <p className="text-sm sm:text-base md:text-lg text-gray-500 mb-6 sm:mb-8 lg:mb-10 leading-relaxed animate-fade-in-up px-2 sm:px-0" style={{ animationDelay: '0.25s' }}>
              Discover experts who solve your specific problems
            </p>
            {!user && (
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start animate-fade-in-up px-2 sm:px-0" style={{ animationDelay: '0.4s' }}>
                <Link
                  href="/register"
                  className="bg-white text-black px-6 sm:px-8 py-3 sm:py-4 rounded-md text-base sm:text-lg font-semibold hover:bg-gray-200 transition-all duration-300 text-center"
                >
                  Start Now for Free
                </Link>
              </div>
            )}
          </div>

          {/* Right side - Floating Glass Bento */}
          <div className="flex items-center justify-center animate-fade-in-up order-1 lg:order-2 mb-6 lg:mb-0 relative" style={{ animationDelay: '0.6s' }}>
            <div className="relative w-full max-w-md h-[400px] lg:h-[500px]">
              {/* Card 1 - Top Left */}
              <div className="absolute top-0 left-0 w-48 h-32 lg:w-56 lg:h-40 backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl card-hover shadow-2xl animate-float">
                <div className="p-4 h-full flex flex-col justify-between">
                  <div className="w-8 h-8 rounded-md bg-white/10"></div>
                  <div className="space-y-2">
                    <div className="h-2 w-3/4 bg-white/10 rounded"></div>
                    <div className="h-2 w-1/2 bg-white/10 rounded"></div>
                  </div>
                </div>
              </div>
              
              {/* Card 2 - Center Right */}
              <div className="absolute top-20 right-0 w-52 h-36 lg:w-64 lg:h-44 backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl card-hover shadow-2xl animate-float" style={{ animationDelay: '1s' }}>
                <div className="p-5 h-full flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-md bg-white/10"></div>
                    <div className="h-2 w-full bg-white/10 rounded"></div>
                    <div className="h-2 w-4/5 bg-white/10 rounded"></div>
                  </div>
                  <div className="h-8 w-24 bg-white/10 rounded-md"></div>
                </div>
              </div>
              
              {/* Card 3 - Bottom Left */}
              <div className="absolute bottom-0 left-8 w-44 h-28 lg:w-52 lg:h-36 backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl card-hover shadow-2xl animate-float" style={{ animationDelay: '2s' }}>
                <div className="p-4 h-full flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-white/10"></div>
                    <div className="h-2 w-20 mx-auto bg-white/10 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

