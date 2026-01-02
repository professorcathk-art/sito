"use client";

import Link from "next/link";

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
  return (
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-cyber-green mb-2 sm:mb-3 text-glow animate-pulse-glow tracking-tight">
            Explore by Category
          </h2>
          <p className="text-base sm:text-lg text-custom-text/80 max-w-2xl mx-auto px-4">
            Find experts across various industries and specialties
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {categories.map((category, index) => (
            <Link
              key={category.name}
              href={`/directory?category=${encodeURIComponent(category.name)}`}
              className="group relative overflow-hidden rounded-xl bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 p-5 sm:p-6 hover:bg-dark-green-800/50 hover:border-cyber-green hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all duration-500 transform hover:-translate-y-1 sm:hover:-translate-y-2 hover:scale-[1.01] sm:hover:scale-[1.02] animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Cyber glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyber-green/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              {/* Border glow */}
              <div className="absolute inset-0 rounded-xl border-2 border-cyber-green/0 group-hover:border-cyber-green/50 transition-all duration-500"></div>
              
              <div className="relative z-10">
                <div className="text-3xl sm:text-4xl mb-2 sm:mb-3 transform group-hover:scale-110 transition-transform duration-300 animate-float" style={{ animationDelay: `${index * 0.2}s` }}>
                  {category.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-cyber-green transition-colors duration-300 mb-1 sm:mb-2 group-hover:text-glow">
                  {category.name}
                </h3>
                <p className="text-custom-text/70 text-xs sm:text-sm transition-colors duration-300 leading-relaxed">
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

