"use client";
import { CTASection } from "./CTASection";
import { DemoSection } from "./DemoSection";
import { FeaturedStudies } from "./FeaturedStudies";
import { FeaturesSection } from "./FeaturesSection";
import { HeroSection } from "./HeroSection";
import "./home.css";

export default function HomePageClient(
  {
    // anonymous
  }: { anonymous: boolean },
) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <HeroSection />
      <FeaturesSection />
      <DemoSection />
      <div className="py-24 px-6 max-w-6xl mx-auto">
        <FeaturedStudies />
      </div>
      <CTASection />
    </div>
  );
}
