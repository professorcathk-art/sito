"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  // Animation handled by CSS class directly

  return (
    <section
      ref={sectionRef}
      className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-dark-green-50/40 via-dark-green-50/20 to-dark-green-50/30 relative overflow-hidden"
    >
      {/* Subtle geometric pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgb(0,0,0) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="hero-content text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-dark-green-900 mb-6 leading-tight">
            Connect with Global
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-dark-green-700 via-dark-green-600 to-dark-green-800">
              Industry Experts
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-12 leading-relaxed">
            Find mentors, guides, and advisors to accelerate your career. Learn from the best minds
            in your industry.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/directory"
              className="group bg-dark-green-700 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-dark-green-800 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg relative overflow-hidden"
            >
              <span className="relative z-10">Browse Experts</span>
              <span className="absolute inset-0 bg-gradient-to-r from-dark-green-800 to-dark-green-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </Link>
            <Link
              href="/register"
              className="bg-white text-dark-green-700 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-dark-green-700 hover:bg-dark-green-50 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              Become an Expert
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

