"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { RubiksCube } from "@/components/rubiks-cube";
import { useAuth } from "@/contexts/auth-context";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { user } = useAuth();

  return (
    <section
      ref={sectionRef}
      className="pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      {/* Animated floating orbs */}
      <div className="absolute top-20 left-4 sm:left-10 w-24 h-24 sm:w-32 sm:h-32 rounded-full blur-3xl animate-float opacity-30" style={{ backgroundColor: 'rgba(0, 255, 136, 0.3)' }}></div>
      <div className="absolute top-40 right-4 sm:right-20 w-28 h-28 sm:w-40 sm:h-40 rounded-full blur-3xl animate-float opacity-20" style={{ backgroundColor: 'rgba(0, 255, 136, 0.3)', animationDelay: '2s' }}></div>
      <div className="absolute bottom-20 left-1/2 w-24 h-24 sm:w-36 sm:h-36 rounded-full blur-3xl animate-float opacity-25" style={{ backgroundColor: 'rgba(0, 255, 136, 0.3)', animationDelay: '4s' }}></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side - Content */}
          <div className="hero-content text-center lg:text-left max-w-2xl mx-auto lg:mx-0 order-2 lg:order-1">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-custom-text mb-4 sm:mb-6 leading-tight animate-fade-in-up tracking-tight">
              Connect with 100+ Global
              <span className="block text-cyber-green mt-2">
                Industry Experts
              </span>
            </h1>
            <p className="text-sm sm:text-lg md:text-xl lg:text-2xl text-custom-text/90 mb-3 sm:mb-4 lg:mb-5 leading-relaxed animate-fade-in-up px-2 sm:px-0" style={{ animationDelay: '0.2s' }}>
              Find mentors, guides, and advisors to accelerate your career. Learn from the best minds
              in your industry.
            </p>
            <p className="text-sm sm:text-base md:text-lg text-custom-text/70 mb-6 sm:mb-8 lg:mb-10 leading-relaxed animate-fade-in-up px-2 sm:px-0" style={{ animationDelay: '0.25s' }}>
              Discover experts who solve your specific problems
            </p>
            {!user && (
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start animate-fade-in-up px-2 sm:px-0" style={{ animationDelay: '0.4s' }}>
                <Link
                  href="/register"
                  className="bg-cyber-green text-dark-green-900 px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-bold border-2 border-cyber-green hover:bg-cyber-green-light hover:border-cyber-green transition-all duration-300 transform hover:scale-105 hover:shadow-xl shadow-[0_0_20px_rgba(0,255,136,0.4)] text-center"
                >
                  Start Now for Free
                </Link>
              </div>
            )}
          </div>

          {/* Right side - Rubik's Cube */}
          <div className="flex items-center justify-center animate-fade-in-up order-1 lg:order-2 mb-6 lg:mb-0" style={{ animationDelay: '0.6s' }}>
            <div className="scale-75 sm:scale-90 lg:scale-100">
              <RubiksCube />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

