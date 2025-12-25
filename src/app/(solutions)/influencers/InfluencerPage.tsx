"use client";

import { CaseStudiesSection } from "../components/CaseStudiesSection";
import { HeroSectionV3 } from "../components/HeroSectionV3";
import { UseCasesSection } from "../components/UseCasesSection";

export default function InfluencerPage() {
  return (
    <>
      {/* Main content - New design for influencers page */}
      <div className="relative z-10">
        <HeroSectionV3 namespace="Solutions.InfluencerPage.HeroSection" />
        <CaseStudiesSection namespace="Solutions.InfluencerPage.CaseStudiesSection" />
        <UseCasesSection namespace="Solutions.InfluencerPage.UseCasesSection" />
      </div>
    </>
  );
}
