"use client";

import { StarField } from "../components/StarField";
import { HeroSectionV3 } from "../components/HeroSectionV3";
import { CaseStudiesSection } from "../components/CaseStudiesSection";
import { UseCasesSection } from "../components/UseCasesSection";

export default function ConsultantPage() {
  return (
    <>
      {/* Optimized star field: 40 stars with reduced motion support */}
      <StarField />

      {/* Main content - New design for consultants page */}
      <div className="relative z-10">
        <HeroSectionV3 namespace="ConsultantPage.HeroSection" />
        <CaseStudiesSection namespace="ConsultantPage.CaseStudiesSection" />
        <UseCasesSection namespace="ConsultantPage.UseCasesSection" />
      </div>
    </>
  );
}


