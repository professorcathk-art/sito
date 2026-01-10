import Link from "next/link";
import { HeroSection } from "@/components/hero-section";
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
      {/* Privacy Policy Link - Server-rendered for Google OAuth compliance */}
      <div className="bg-dark-green-800/30 border-b border-cyber-green/20 py-2 px-4 text-center">
        <p className="text-xs sm:text-sm text-custom-text/80">
          <Link href="/privacy" className="text-cyber-green hover:text-cyber-green-light underline font-medium">
            Privacy Policy (https://sito.club/privacy)
          </Link>
          {" · "}
          <Link href="/terms" className="text-cyber-green hover:text-cyber-green-light underline font-medium">
            Terms of Service (https://sito.club/terms)
          </Link>
        </p>
      </div>
      <HeroSection />
      <FeaturedExperts />
      <FeaturedBlogPosts />
      <FeaturedCourses />
      <FeaturesSection />
      <TestimonialsSection />
      <Footer />
    </main>
  );
}

