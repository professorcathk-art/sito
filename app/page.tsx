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

