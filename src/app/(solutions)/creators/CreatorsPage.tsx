"use client";

import { reginalS3Origin } from "@/app/(public)/home-v3/actions";
import { useEffect, useState } from "react";
import { AdvancedWorkflowSection } from "./components/AdvancedWorkflowSection";
import { AskAudienceSection } from "./components/AskAudienceSection";
import { CTASection } from "./components/CTASection";
import { HeroSection } from "./components/HeroSection";
import { PlanSmarterSection } from "./components/PlanSmarterSection";
import { TurnResearchSection } from "./components/TurnResearchSection";
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
        <HeroSection />
        <PlanSmarterSection s3Origin={s3Origin} />
        <AskAudienceSection s3Origin={s3Origin} />
        <TurnResearchSection />
        <AdvancedWorkflowSection />
        <CTASection />
      </div>
    </>
  ) : null;
}
