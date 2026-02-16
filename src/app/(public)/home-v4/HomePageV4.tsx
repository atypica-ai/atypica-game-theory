"use client";

import { HeroSection } from "./HeroSection";
import { AgentComparisonSection } from "./AgentComparisonSection";
import { DualRolesSection } from "./DualRolesSection";
import { UnderstandingMethodsSection } from "./UnderstandingMethodsSection";
import { UseCasesSection } from "./UseCasesSection";
import { StatsSection } from "./StatsSection";
import { CTASection } from "./CTASection";

export default function HomePageV4() {
  return (
    <>
      <HeroSection />
      <AgentComparisonSection />
      <DualRolesSection />
      <UnderstandingMethodsSection />
      <UseCasesSection />
      <StatsSection />
      <CTASection />
    </>
  );
}
