"use client";

import { StarField } from "../creators/components/StarField";
import { HeroSectionV3 } from "../creators/components/HeroSectionV3";
import { CaseStudiesSection } from "../creators/components/CaseStudiesSection";
import { UseCasesSection } from "../creators/components/UseCasesSection";

export default function StartupOwnerPage() {
  return (
    <>
      {/* Optimized star field: 40 stars with reduced motion support */}
      <StarField />

      {/* Main content - New design for startup owners page */}
      <div className="relative z-10">
        <HeroSectionV3 namespace="StartupOwnerPage.HeroSection" />
        <CaseStudiesSection namespace="StartupOwnerPage.CaseStudiesSection" />
        <UseCasesSection namespace="StartupOwnerPage.UseCasesSection" />
      </div>
    </>
  );
}


