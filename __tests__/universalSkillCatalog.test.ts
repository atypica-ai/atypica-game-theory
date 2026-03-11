import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { findManyMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
}));

vi.mock("@/prisma/prisma", () => ({
  prisma: {
    agentSkill: {
      findMany: findManyMock,
    },
  },
}));

import {
  buildAvailableSkillsXml,
  buildUniversalSkillCatalog,
  buildUniversalSkillsSection,
} from "@/app/(universal)/skills/catalog";

describe("universal skill catalog", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("includes builtin study skill alongside uploaded skills", async () => {
    findManyMock.mockResolvedValue([
      {
        id: 7,
        name: "market-researcher",
        description: "Specialized market research skill",
      },
    ]);

    const catalog = await buildUniversalSkillCatalog({ userId: 1 });

    expect(catalog.uploadedSkills).toEqual([{ id: 7, name: "market-researcher" }]);
    expect(catalog.skills.map((skill) => skill.name)).toContain("atypica-study-executor");
    expect(catalog.skills.map((skill) => skill.name)).toContain("market-researcher");
  });

  it("renders available_skills xml with stable /skills paths", () => {
    const xml = buildAvailableSkillsXml([
      {
        name: "atypica-study-executor",
        description: "Research executor",
        location: "/skills/atypica-study-executor/SKILL.md",
        source: "builtin",
      },
    ]);

    expect(xml).toContain("<available_skills>");
    expect(xml).toContain("/skills/atypica-study-executor/SKILL.md");
  });

  it("builds a skill usage section for prompts", () => {
    const section = buildUniversalSkillsSection({
      locale: "en-US",
      skills: [
        {
          name: "atypica-study-executor",
          description: "Research executor",
          location: "/skills/atypica-study-executor/SKILL.md",
          source: "builtin",
        },
      ],
    });

    expect(section).toContain("## Available Skills");
    expect(section).toContain("How to Use Skills");
    expect(section).toContain("/skills/skill-name/SKILL.md");
  });
});
