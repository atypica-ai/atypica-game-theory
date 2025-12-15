"use client";

import { StarField } from "./components/StarField";
import { HeroSectionGameStyle } from "./components/HeroSectionGameStyle";
import { PlanSmarterSectionGameStyle } from "./components/PlanSmarterSectionGameStyle";
import { AskAudienceSectionGameStyle } from "./components/AskAudienceSectionGameStyle";
import { TurnResearchSectionGameStyle } from "./components/TurnResearchSectionGameStyle";
import { AdvancedWorkflowSectionGameStyle } from "./components/AdvancedWorkflowSectionGameStyle";
import { CTASectionGameStyle } from "./components/CTASectionGameStyle";

export default function CreatorPageGameStyle() {
  return (
    <>
      {/* 保留第一阶段的星空背景 */}
      <StarField />

      {/* 主要内容 - 游戏化设计风格 + 第二阶段内容 + 第三阶段图像生成 */}
      <div className="relative" style={{ zIndex: 1 }}>
        <HeroSectionGameStyle />
        <PlanSmarterSectionGameStyle />
        <AskAudienceSectionGameStyle />
        <TurnResearchSectionGameStyle />
        <AdvancedWorkflowSectionGameStyle />
        <CTASectionGameStyle />
      </div>
    </>
  );
}

