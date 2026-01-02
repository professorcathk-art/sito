import Link from "next/link";
import { HeroSection } from "@/components/hero-section";
import { CategorySection } from "@/components/category-section";
import { FeaturesSection } from "@/components/features-section";
import { FeaturedExperts } from "@/components/featured-experts";
import { FeaturedCourses } from "@/components/featured-courses";
import { FeaturedBlogPosts } from "@/components/featured-blog-posts";
import { TestimonialsSection } from "@/components/testimonials-section";
import { Footer } from "@/components/footer";
import { Navigation } from "@/components/navigation";

export default function Home() {
  return (
    <main className="min-h-screen bg-custom-bg relative overflow-hidden">
      {/* Animated scan line */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyber-green/20 to-transparent animate-scan-line"></div>
      </div>
      
      {/* Cyber grid overlay */}
      <div className="fixed inset-0 cyber-grid opacity-20 pointer-events-none"></div>
      
      <Navigation />
      <HeroSection />
      <FeaturedExperts />
      <FeaturedBlogPosts />
      <FeaturedCourses />
      <CategorySection />
      <FeaturesSection />
      <TestimonialsSection />
      <Footer />
    </main>
  );
}

