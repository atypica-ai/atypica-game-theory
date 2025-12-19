"use client";

import { reginalS3Origin } from "@/app/(public)/home-v3/actions";
import { useEffect, useState } from "react";
import { AdvancedWorkflowSectionV3 } from "./components/AdvancedWorkflowSectionV3";
import { AskAudienceSectionV3 } from "./components/AskAudienceSectionV3";
import { CTASectionV3 } from "./components/CTASectionV3";
import { HeroSectionV3 } from "./components/HeroSectionV3";
import { PlanSmarterSectionV3 } from "./components/PlanSmarterSectionV3";
import { TurnResearchSectionV3 } from "./components/TurnResearchSectionV3";
import "./style.css";

export default function CreatorsPage() {
  const [s3Origin, setS3Origin] = useState<string | null>(null);

  useEffect(() => {
    reginalS3Origin().then((origin) => {
      setS3Origin(origin);
    });
  }, []);

  return s3Origin ? (
    <>
      {/* Optimized star field: 40 stars with reduced motion support */}
      {/*<StarField />*/}

      {/* Main content - Professional, minimal design with brand green accents */}
      <div className="relative" style={{ zIndex: 1 }}>
        <HeroSectionV3 />
        <PlanSmarterSectionV3 s3Origin={s3Origin} />
        <AskAudienceSectionV3 s3Origin={s3Origin} />
        <TurnResearchSectionV3 />
        <AdvancedWorkflowSectionV3 />
        <CTASectionV3 />
      </div>
    </>
  ) : null;
}
