"use client";

import { CaseStudiesSection } from "../components/CaseStudiesSection";
import { HeroSectionV3 } from "../components/HeroSectionV3";
import { UseCasesSection } from "../components/UseCasesSection";

export default function CreatorsPage() {
  return (
    <>
      {/* Main content - New design for creators page */}
      <div className="relative z-10">
        <HeroSectionV3 namespace="Solutions.CreatorsPage.HeroSection" />
        <CaseStudiesSection namespace="Solutions.CreatorsPage.CaseStudiesSection" />
        <UseCasesSection namespace="Solutions.CreatorsPage.UseCasesSection" />
      </div>
    </>
  );
}
