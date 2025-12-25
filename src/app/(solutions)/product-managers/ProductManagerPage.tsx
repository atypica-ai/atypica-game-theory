"use client";

import { CaseStudiesSection } from "../components/CaseStudiesSection";
import { HeroSectionV3 } from "../components/HeroSectionV3";
import { UseCasesSection } from "../components/UseCasesSection";

export default function ProductManagerPage() {
  return (
    <>
      {/* Main content - New design for product managers page */}
      <div className="relative z-10">
        <HeroSectionV3 namespace="Solutions.ProductManagerPage.HeroSection" />
        <CaseStudiesSection namespace="Solutions.ProductManagerPage.CaseStudiesSection" />
        <UseCasesSection namespace="Solutions.ProductManagerPage.UseCasesSection" />
      </div>
    </>
  );
}
