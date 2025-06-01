"use client";
import { useTranslations } from "next-intl";
import { FeaturedStudies } from "../home/FeaturedStudies";
import { InputSection } from "../home/InputSection";
import { CTASection } from "./CTASection";
import { FeaturesSection } from "./FeaturesSection";
import { HeroSection } from "./HeroSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { UseCasesSection } from "./UseCasesSection";

export default function LandingPageClient(
  {
    // anonymous
  }: { anonymous: boolean },
) {
  const t = useTranslations();
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {/* Hero Section */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <HeroSection />
      </div>

      {/* Quick Input Section */}
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 px-8 py-12">
        <div className="max-w-4xl mx-auto text-center mb-8">
          <h2 className="text-2xl font-bold mb-4">Get Started in Seconds</h2>
          <p className="text-muted-foreground">
            Submit your research question and watch AI generate comprehensive insights
          </p>
        </div>
        <InputSection />
      </div>

      {/* Features Section */}
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <FeaturesSection />
      </div>

      {/* Use Cases Section */}
      <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <UseCasesSection />
      </div>

      {/* Testimonials Section */}
      <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
        <TestimonialsSection />
      </div>

      {/* Featured Studies */}
      <div className="animate-in fade-in slide-in-from-bottom-14 duration-1000 px-8 py-12">
        <FeaturedStudies />
      </div>

      {/* CTA Section */}
      <div className="animate-in fade-in slide-in-from-bottom-16 duration-1000">
        <CTASection />
      </div>
    </div>
  );
}
