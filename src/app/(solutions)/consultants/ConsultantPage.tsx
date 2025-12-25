"use client";

import { CaseStudiesSection } from "../components/CaseStudiesSection";
import { HeroSectionV3 } from "../components/HeroSectionV3";
import { UseCasesSection } from "../components/UseCasesSection";

export default function ConsultantPage() {
  return (
    <>
      {/* Main content - New design for consultants page */}
      <div className="relative z-10">
        <HeroSectionV3 namespace="Solutions.ConsultantPage.HeroSection" />
        <CaseStudiesSection namespace="Solutions.ConsultantPage.CaseStudiesSection" />
        <UseCasesSection namespace="Solutions.ConsultantPage.UseCasesSection" />
      </div>
    </>
  );
}
