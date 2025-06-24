"use client";
import { AudienceSection } from "./AudienceSection";
import { HeroSection } from "./HeroSection";
import { HowItWorks } from "./HowItWorks";
import { PersonaSimulationSection } from "./PersonaSimulationSection";
import { StatsSection } from "./StatsSection";
import { TestimonialSection } from "./TestimonialSection";
import { UseCaseScenarios } from "./UseCaseScenarios";
import { UseCases } from "./UseCases";
import "./home.css";

export default function HomePageClient() {
  return (
    <div className="bg-white dark:bg-black">
      <HeroSection />
      <StatsSection />
      <UseCaseScenarios />
      <UseCases />
      <HowItWorks />
      <AudienceSection />
      <TestimonialSection />
      <PersonaSimulationSection />
    </div>
  );
}
