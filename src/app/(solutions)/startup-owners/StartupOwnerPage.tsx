"use client";

import { CaseStudiesSection } from "../components/CaseStudiesSection";
import { HeroSectionV3 } from "../components/HeroSectionV3";
import { UseCasesSection } from "../components/UseCasesSection";

export default function StartupOwnerPage() {
  return (
    <>
      {/* Main content - New design for startup owners page */}
      <div className="relative z-10">
        <HeroSectionV3 namespace="StartupOwnerPage.HeroSection" />
        <CaseStudiesSection namespace="StartupOwnerPage.CaseStudiesSection" />
        <UseCasesSection namespace="StartupOwnerPage.UseCasesSection" />
      </div>
    </>
  );
}
