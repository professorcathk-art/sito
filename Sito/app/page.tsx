import Link from "next/link";
import { HeroSection } from "@/components/hero-section";
import { CategorySection } from "@/components/category-section";
import { FeaturesSection } from "@/components/features-section";
import { Navigation } from "@/components/navigation";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-dark-green-50/20 via-white to-dark-green-50/30">
      <Navigation />
      <HeroSection />
      <CategorySection />
      <FeaturesSection />
    </main>
  );
}

