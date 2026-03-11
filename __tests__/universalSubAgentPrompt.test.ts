import { describe, expect, it } from "vitest";

import {
  getSubAgentModePrompt,
  subAgentFlexiblePrompt,
  subAgentPanelPrompt,
  subAgentStudyPrompt,
} from "@/app/(universal)/tools/createSubAgent/prompt";

describe("universal sub-agent prompt", () => {
  it("study mode prefers skills instead of forcing a fixed study sequence", () => {
    const prompt = subAgentStudyPrompt({ locale: "zh-CN" });

    expect(prompt).toContain("atypica-study-executor");
    expect(prompt).not.toContain("必须执行一次 generateReport");
    expect(prompt).not.toContain("先搜索或构建合适的人设");
  });

  it("flexible mode keeps report generation optional", () => {
    const prompt = subAgentFlexiblePrompt({ locale: "en-US" });

    expect(prompt).toContain("Produce report or podcast artifacts only when the task explicitly asks for them.");
  });

  it("panel mode biases toward existing context without prohibiting fallback research tools", () => {
    const prompt = subAgentPanelPrompt({ locale: "en-US" });

    expect(prompt).toContain("Use that context first");
    expect(prompt).toContain("Only add `searchPersonas`");
  });

  it("returns the correct prompt for each mode", () => {
    expect(getSubAgentModePrompt({ mode: "study", locale: "en-US" })).toContain(
      "research-oriented task",
    );
    expect(getSubAgentModePrompt({ mode: "flexible", locale: "en-US" })).toContain(
      "task needs a skill",
    );
    expect(getSubAgentModePrompt({ mode: "panel", locale: "en-US" })).toContain(
      "cohort or panel context",
    );
  });
});
