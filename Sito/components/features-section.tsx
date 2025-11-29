"use client";

import { useEffect, useRef } from "react";

const features = [
  {
    title: "Expert Profiles",
    description: "Comprehensive profiles showcasing expertise, experience, and achievements",
    icon: "👤",
    delay: "0ms",
  },
  {
    title: "Direct Messaging",
    description: "Connect and communicate directly with experts in your field",
    icon: "💬",
    delay: "100ms",
  },
  {
    title: "Verified Experts",
    description: "All experts are verified to ensure quality and authenticity",
    icon: "✅",
    delay: "200ms",
  },
  {
    title: "Global Network",
    description: "Access industry leaders from around the world",
    icon: "🌍",
    delay: "300ms",
  },
];

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in-up");
          }
        });
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-dark-green-50/20 via-white to-dark-green-50/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 opacity-0">
          <h2 className="text-4xl md:text-5xl font-bold text-dark-green-900 mb-4">
            Why Choose Sito?
          </h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Everything you need to find and connect with industry experts
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              ref={(el) => {
                if (el) cardsRef.current[index] = el;
              }}
              className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 border-2 border-dark-green-100 hover:border-dark-green-300 opacity-0"
              style={{ transitionDelay: feature.delay }}
            >
              <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-dark-green-900 mb-3 group-hover:text-dark-green-700 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-700 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

