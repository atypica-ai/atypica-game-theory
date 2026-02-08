import type { DisplayCategory, Doc } from "./types";

// Display category mapping for FAQ and guides
export const displayCategoryMapping: Record<
  DisplayCategory,
  {
    labelZh: string;
    labelEn: string;
  }
> = {
  research: {
    labelZh: "市场研究",
    labelEn: "Market Research",
  },
  persona: {
    labelZh: "AI 人设",
    labelEn: "AI Persona",
  },
  interview: {
    labelZh: "访谈项目",
    labelEn: "Interview Project",
  },
  sage: {
    labelZh: "AI Sage",
    labelEn: "AI Sage",
  },
  general: {
    labelZh: "通用",
    labelEn: "General",
  },
};

// Extract display category from file path
function getDisplayCategoryFromPath(filePath: string): DisplayCategory | null {
  // Extract directory name from path like "docs/product/faq/research/..."
  const match = filePath.match(/\/(faq|guides?)\/(research|persona|interview|sage|general)\//);
  return match ? (match[2] as DisplayCategory) : null;
}

// Helper functions for FAQ and guides
export function getDocsByDisplayCategory(
  docs: Doc[],
  displayCategory: DisplayCategory,
): Doc[] {
  return docs.filter((doc) => {
    if (doc.category !== "faq" && doc.category !== "guide") return false;
    const category = getDisplayCategoryFromPath(doc.filePathZh || doc.filePathEn);
    return category === displayCategory;
  });
}

export function groupDocsByDisplayCategory(
  docs: Doc[],
  category: "faq" | "guide",
): Record<DisplayCategory, Doc[]> {
  const result = {
    research: [],
    persona: [],
    interview: [],
    sage: [],
    general: [],
  } as Record<DisplayCategory, Doc[]>;

  docs.forEach((doc) => {
    if (doc.category !== category) return;
    const displayCat = getDisplayCategoryFromPath(doc.filePathZh || doc.filePathEn);
    if (displayCat && result[displayCat]) {
      result[displayCat].push(doc);
    }
  });

  return result;
}
