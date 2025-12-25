"use client";

import { StarField } from "../components/StarField";
import { HeroSectionV3 } from "../components/HeroSectionV3";
import { CaseStudiesSection } from "../components/CaseStudiesSection";
import { UseCasesSection } from "../components/UseCasesSection";

export default function MarketerPage() {
  return (
    <>
      {/* Optimized star field: 40 stars with reduced motion support */}
      <StarField />

      {/* Main content - New design for marketers page */}
      <div className="relative z-10">
        <HeroSectionV3 namespace="MarketerPage.HeroSection" />
        <CaseStudiesSection namespace="MarketerPage.CaseStudiesSection" />
        <UseCasesSection namespace="MarketerPage.UseCasesSection" />
      </div>
    </>
  );
}


