"use client";
import { CTASection } from "./CTASection";
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
    <div>
      <HeroSection />
      <FeaturesSection />
      {/* <DemoSection /> */}
      <FeaturedStudies />
      <CTASection />
    </div>
  );
}
