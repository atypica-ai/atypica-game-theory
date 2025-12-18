"use client";

import { AdvancedWorkflowSectionV3 } from "./components/AdvancedWorkflowSectionV3";
import { AskAudienceSectionV3 } from "./components/AskAudienceSectionV3";
import { CTASectionV3 } from "./components/CTASectionV3";
import { HeroSectionV3 } from "./components/HeroSectionV3";
import { PlanSmarterSectionV3 } from "./components/PlanSmarterSectionV3";
import { StarField } from "./components/StarField";
import { TurnResearchSectionV3 } from "./components/TurnResearchSectionV3";

export default function CreatorPage() {
  return (
    <>
      {/* Optimized star field: 40 stars with reduced motion support */}
      <StarField />

      {/* Main content - Professional, minimal design with brand green accents */}
      <div className="relative" style={{ zIndex: 1 }}>
        <HeroSectionV3 />
        <PlanSmarterSectionV3 />
        <AskAudienceSectionV3 />
        <TurnResearchSectionV3 />
        <AdvancedWorkflowSectionV3 />
        <CTASectionV3 />
      </div>
    </>
  );
}
