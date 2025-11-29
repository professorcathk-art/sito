"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const categories = [
  {
    name: "Website Development",
    description: "Frontend, backend, and full-stack web development experts",
    icon: "🌐",
    color: "from-blue-500 to-cyan-500",
    delay: "0ms",
  },
  {
    name: "Software Development",
    description: "Mobile apps, desktop applications, and enterprise solutions",
    icon: "💻",
    color: "from-purple-500 to-pink-500",
    delay: "100ms",
  },
  {
    name: "Trading",
    description: "Stock market, forex, cryptocurrency, and investment strategies",
    icon: "📈",
    color: "from-green-500 to-emerald-500",
    delay: "200ms",
  },
  {
    name: "Entrepreneur",
    description: "Business strategy, startup guidance, and scaling expertise",
    icon: "🚀",
    color: "from-orange-500 to-red-500",
    delay: "300ms",
  },
  {
    name: "Design",
    description: "UI/UX design, graphic design, and creative direction",
    icon: "🎨",
    color: "from-pink-500 to-rose-500",
    delay: "400ms",
  },
  {
    name: "Marketing",
    description: "Digital marketing, SEO, content strategy, and brand building",
    icon: "📢",
    color: "from-indigo-500 to-blue-500",
    delay: "500ms",
  },
];

export function CategorySection() {
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
    <section ref={sectionRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-dark-green-50/30 via-white to-dark-green-50/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 opacity-0">
          <h2 className="text-4xl md:text-5xl font-bold text-dark-green-900 mb-4">
            Explore by Category
          </h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Find experts across various industries and specialties
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <Link
              key={category.name}
              href={`/directory?category=${encodeURIComponent(category.name)}`}
              ref={(el) => {
                if (el) cardsRef.current[index] = el;
              }}
              className="group relative overflow-hidden rounded-2xl bg-white border-2 border-dark-green-100 p-8 hover:border-dark-green-300 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-[1.02] opacity-0"
              style={{ transitionDelay: category.delay }}
            >
              {/* Dark green gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-dark-green-600 to-dark-green-800 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Subtle shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              <div className="relative z-10">
                <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                  {category.icon}
                </div>
                <h3 className="text-2xl font-bold text-dark-green-900 group-hover:text-white transition-colors duration-300 mb-2">
                  {category.name}
                </h3>
                <p className="text-gray-700 group-hover:text-white/90 transition-colors duration-300">
                  {category.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

