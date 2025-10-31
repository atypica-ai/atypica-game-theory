"use client";
import { HeroSection } from "./HeroSection";
import { HowItWorks } from "./HowItWorks";
import { InsightRadioCard } from "./InsightRadioCard";
import { PersonaSimulationSection } from "./PersonaSimulationSection";
import { StatsSection } from "./StatsSection";
import { UseCaseScenarios } from "./UseCaseScenarios";
import { UseCases } from "./UseCases";
import "./home.css";

export default function HomePageClient() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <UseCaseScenarios />
      <HowItWorks />
      <UseCases />
      {/* <AudienceSection /> */}
      {/* <TestimonialSection /> */}
      <PersonaSimulationSection />

      {/* Fixed Insight Radio Card */}
      <InsightRadioCard />
    </>
  );
}
