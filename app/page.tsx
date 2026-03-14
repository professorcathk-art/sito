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
    <main className="min-h-screen bg-[#0B0F19] relative overflow-x-hidden">
      <Navigation />
      {/* Hero glow - positioned at top right */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/15 blur-[150px] rounded-full pointer-events-none -z-10 transform translate-x-1/3 -translate-y-1/4" />
      {/* Privacy Policy Link - Server-rendered for Google OAuth compliance */}
      <div className="border-b border-slate-800/50 py-2 px-4 text-center">
        <p className="text-xs sm:text-sm text-slate-400">
          <Link href="/privacy" className="text-slate-50 hover:text-indigo-400 underline font-medium">
            Privacy Policy (https://sito.club/privacy)
          </Link>
          {" · "}
          <Link href="/terms" className="text-slate-50 hover:text-indigo-400 underline font-medium">
            Terms of Service (https://sito.club/terms)
          </Link>
        </p>
      </div>
      <HeroSection />
      <FeaturedCourses />
      <FeaturedExperts />
      <FeaturedBlogPosts />
      <FeaturesSection />
      <TestimonialsSection />
      <Footer />
    </main>
  );
}

