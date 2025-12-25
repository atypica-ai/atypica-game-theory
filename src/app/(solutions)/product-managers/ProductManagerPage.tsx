"use client";

import { StarField } from "../components/StarField";
import { HeroSectionV3 } from "../components/HeroSectionV3";
import { CaseStudiesSection } from "../components/CaseStudiesSection";
import { UseCasesSection } from "../components/UseCasesSection";

export default function ProductManagerPage() {
  return (
    <>
      {/* Optimized star field: 40 stars with reduced motion support */}
      <StarField />

      {/* Main content - New design for product managers page */}
      <div className="relative z-10">
        <HeroSectionV3 namespace="ProductManagerPage.HeroSection" />
        <CaseStudiesSection namespace="ProductManagerPage.CaseStudiesSection" />
        <UseCasesSection namespace="ProductManagerPage.UseCasesSection" />
      </div>
    </>
  );
}


