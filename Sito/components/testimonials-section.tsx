"use client";

import { useEffect, useRef, useState } from "react";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
}

const testimonials: Testimonial[] = [
  {
    quote: "Sito has transformed how I connect with industry experts. The platform makes it easy to find mentors who truly understand my field.",
    author: "Sarah Chen",
    role: "Software Engineer",
    company: "Microsoft",
  },
  {
    quote: "As an expert, I love being able to share my knowledge and help others grow. The messaging system makes communication seamless.",
    author: "Michael Rodriguez",
    role: "Senior Developer",
    company: "Stripe",
  },
  {
    quote: "The best platform for finding mentors. I've connected with amazing experts who have guided my career journey.",
    author: "Emma Wilson",
    role: "Product Manager",
    company: "Airbnb",
  },
  {
    quote: "Sito bridges the gap between experts and learners. It's exactly what the industry needed.",
    author: "David Kim",
    role: "Trading Strategist",
    company: "Goldman Sachs",
  },
  {
    quote: "I've found incredible mentors through Sito. The platform is intuitive and the experts are top-notch.",
    author: "Lisa Zhang",
    role: "Marketing Director",
    company: "Meta",
  },
];

export function TestimonialsSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let scrollPosition = 0;
    const scrollSpeed = 0.5;

    const scroll = () => {
      if (!isPaused) {
        scrollPosition += scrollSpeed;
        const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        
        if (scrollPosition >= maxScroll) {
          scrollPosition = 0;
        }
        
        scrollContainer.scrollLeft = scrollPosition;
      }
      requestAnimationFrame(scroll);
    };

    const animationId = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPaused]);

  return (
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-custom-text mb-3 sm:mb-4 tracking-tight">
            Trusted by Professionals Worldwide
          </h2>
          <p className="text-base sm:text-lg text-custom-text/80 px-4">
            Join thousands of users connecting with industry experts
          </p>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Duplicate testimonials for seamless loop */}
          {[...testimonials, ...testimonials].map((testimonial, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[85vw] sm:w-[45vw] md:w-[40vw] lg:w-[32vw] bg-dark-green-800/30 backdrop-blur-sm border border-cyber-green/30 rounded-2xl p-6 sm:p-8 hover:border-cyber-green/50 transition-all duration-300 snap-start"
            >
              <div className="mb-4">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-cyber-green mb-3 sm:mb-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.996 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>
              <p className="text-custom-text/90 mb-4 sm:mb-6 text-sm sm:text-base lg:text-lg leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div>
                <p className="font-semibold text-custom-text text-sm sm:text-base">{testimonial.author}</p>
                <p className="text-xs sm:text-sm text-custom-text/70">
                  {testimonial.role} at {testimonial.company}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

