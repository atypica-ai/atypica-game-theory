"use client";

import { CaseStudiesSection } from "../components/CaseStudiesSection";
import { HeroSectionV3 } from "../components/HeroSectionV3";
import { UseCasesSection } from "../components/UseCasesSection";

export default function MarketerPage() {
  return (
    <>
      {/* Main content - New design for marketers page */}
      <div className="relative z-10">
        <HeroSectionV3 namespace="Solutions.MarketerPage.HeroSection" />
        <CaseStudiesSection namespace="Solutions.MarketerPage.CaseStudiesSection" />
        <UseCasesSection namespace="Solutions.MarketerPage.UseCasesSection" />
      </div>
    </>
  );
}
