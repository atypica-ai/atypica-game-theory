import type { DisplayCategory, Doc } from "./types";

// Display category mapping for FAQ and guides
export const displayCategoryMapping: Record<
  DisplayCategory,
  {
    labelZh: string;
    labelEn: string;
    directories: string[];
  }
> = {
  research: {
    labelZh: "市场研究",
    labelEn: "Market Research",
    directories: ["plan-mode", "scout-agent", "memory-system"],
  },
  persona: {
    labelZh: "AI 人设",
    labelEn: "AI Persona",
    directories: ["ai-persona"],
  },
  interview: {
    labelZh: "访谈项目",
    labelEn: "Interview Project",
    directories: ["interview-discussion"],
  },
  sage: {
    labelZh: "AI Sage",
    labelEn: "AI Sage",
    directories: ["sage-system"],
  },
  general: {
    labelZh: "通用",
    labelEn: "General",
    directories: ["general"],
  },
};

// Helper functions for FAQ and guides
export function getDocsByDisplayCategory(
  docs: Doc[],
  displayCategory: DisplayCategory,
): Doc[] {
  const directories = displayCategoryMapping[displayCategory].directories;
  return docs.filter(
    (doc) =>
      (doc.category === "faq" || doc.category === "guide") &&
      doc.directory &&
      directories.includes(doc.directory),
  );
}

export function groupDocsByDisplayCategory(
  docs: Doc[],
  category: "faq" | "guide",
): Record<DisplayCategory, Doc[]> {
  const result = {} as Record<DisplayCategory, Doc[]>;

  (Object.keys(displayCategoryMapping) as DisplayCategory[]).forEach((displayCat) => {
    const directories = displayCategoryMapping[displayCat].directories;
    result[displayCat] = docs.filter(
      (doc) => doc.category === category && doc.directory && directories.includes(doc.directory),
    );
  });

  return result;
}
