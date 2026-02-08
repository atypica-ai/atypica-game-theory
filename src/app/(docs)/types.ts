export type DocCategory = "feature" | "competitor" | "faq" | "guide";

export type DisplayCategory = "research" | "persona" | "interview" | "sage" | "general";

export interface Doc {
  slug: string;
  titleZh: string;
  titleEn: string;
  category: DocCategory;
  descriptionZh: string;
  descriptionEn: string;
  filePathZh: string;
  filePathEn: string;
  directory?: string; // For FAQ and guides: 'plan-mode', 'ai-persona', 'scout-agent', etc.
}

export const categoryLabels: Record<DocCategory, { zh: string; en: string }> = {
  feature: { zh: "功能特性", en: "Features" },
  competitor: { zh: "竞品对比", en: "Competitors" },
  faq: { zh: "常见问题", en: "FAQ" },
  guide: { zh: "使用指南", en: "Guides" },
};

// Helper functions
export function getDocBySlug(docs: Doc[], slug: string): Doc | undefined {
  return docs.find((doc) => doc.slug === slug);
}

export function getDocsByCategory(docs: Doc[], category: DocCategory): Doc[] {
  return docs.filter((doc) => doc.category === category);
}
