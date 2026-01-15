export type DocCategory = "features" | "competitors" | "guides";

export interface Doc {
  slug: string;
  titleZh: string;
  titleEn: string;
  category: DocCategory;
  descriptionZh: string;
  descriptionEn: string;
  filePathZh: string;
  filePathEn: string;
}

export const docs: Doc[] = [
  // Feature Documentation
  {
    slug: "interview-vs-discussion",
    titleZh: "Interview vs Discussion：什么时候用哪个？",
    titleEn: "Interview vs Discussion: Which One Should You Use?",
    category: "features",
    descriptionZh: "深度对比 Interview Chat 和 Discussion Chat 的差异、适用场景和能力边界",
    descriptionEn:
      "In-depth comparison of Interview Chat and Discussion Chat: differences, use cases, and capabilities",
    filePathZh: "docs/product/features/interview-vs-discussion-zh.md",
    filePathEn: "docs/product/features/interview-vs-discussion-en.md",
  },
  {
    slug: "scout-agent",
    titleZh: "Scout Agent：社交媒体深度观察",
    titleEn: "Scout Agent: Deep Social Media Observation",
    category: "features",
    descriptionZh: "通过沉浸式观察社交媒体内容，理解用户群体的生活方式、价值观和精神世界",
    descriptionEn:
      "Understand user groups' lifestyles, values, and mindsets through immersive social media observation",
    filePathZh: "docs/product/features/scout-agent-zh.md",
    filePathEn: "docs/product/features/scout-agent-en.md",
  },
  {
    slug: "ai-persona-tiers",
    titleZh: "AI Persona 三层体系架构",
    titleEn: "AI Persona Three-Tier System",
    category: "features",
    descriptionZh: "基于一致性科学的四级分层 Persona 库，构建高质量 AI 人设",
    descriptionEn:
      "Four-tier persona library based on consistency science for building high-quality AI personas",
    filePathZh: "docs/product/features/ai-persona-tiers-zh.md",
    filePathEn: "docs/product/features/ai-persona-tiers-en.md",
  },
  {
    slug: "plan-mode",
    titleZh: "Plan Mode：让 AI 先懂你要什么",
    titleEn: "Plan Mode: Let AI Understand What You Want First",
    category: "features",
    descriptionZh: "对话即规划，AI 自动判断研究类型，展示完整计划，一键确认开始",
    descriptionEn:
      "Conversation is planning - AI auto-determines research type, shows complete plan, one-click confirmation",
    filePathZh: "docs/product/features/plan-mode-zh.md",
    filePathEn: "docs/product/features/plan-mode-en.md",
  },
  {
    slug: "memory-system",
    titleZh: "Memory System：AI 的渐进式学习系统",
    titleEn: "Memory System: Progressive Learning for AI",
    category: "features",
    descriptionZh: "持久化记忆系统，让 AI 越用越懂你，无需重复询问",
    descriptionEn:
      "Persistent memory system that helps AI understand you better over time without repetitive questions",
    filePathZh: "docs/product/features/memory-system-zh.md",
    filePathEn: "docs/product/features/memory-system-en.md",
  },
  {
    slug: "fast-insight-agent",
    titleZh: "Fast Insight Agent：快速洞察生成",
    titleEn: "Fast Insight Agent: Rapid Insight Generation",
    category: "features",
    descriptionZh: "播客驱动的快速研究工作流，30分钟生成深度洞察报告",
    descriptionEn:
      "Podcast-driven rapid research workflow generating deep insight reports in 30 minutes",
    filePathZh: "docs/product/features/fast-insight-agent-zh.md",
    filePathEn: "docs/product/features/fast-insight-agent-en.md",
  },
  {
    slug: "reference-attachments",
    titleZh: "参考研究 + 文件附件",
    titleEn: "Reference Studies + File Attachments",
    category: "features",
    descriptionZh: "通过参考研究和文件附件，让 AI 基于完整上下文进行深度分析",
    descriptionEn:
      "Enable AI to perform deep analysis based on complete context through reference studies and file attachments",
    filePathZh: "docs/product/features/reference-attachments-zh.md",
    filePathEn: "docs/product/features/reference-attachments-en.md",
  },
  {
    slug: "mcp-integration",
    titleZh: "MCP 集成能力",
    titleEn: "MCP Integration Capabilities",
    category: "features",
    descriptionZh: "通过 MCP 协议打破数据孤岛，让 AI 接入企业内部工具和数据源",
    descriptionEn:
      "Break data silos through MCP protocol, connecting AI to enterprise internal tools and data sources",
    filePathZh: "docs/product/features/mcp-integration-zh.md",
    filePathEn: "docs/product/features/mcp-integration-en.md",
  },
  {
    slug: "sage-system",
    titleZh: "Sage：可进化的专家系统",
    titleEn: "Sage: Evolving Expert System",
    category: "features",
    descriptionZh: "通过主动学习和知识积累，Sage 系统会随着使用不断进化",
    descriptionEn:
      "Through active learning and knowledge accumulation, the Sage system evolves with usage",
    filePathZh: "docs/product/features/sage-system-zh.md",
    filePathEn: "docs/product/features/sage-system-en.md",
  },

  // Competitor Comparisons
  {
    slug: "atypica-vs-traditional-research",
    titleZh: "atypica vs 传统调研公司",
    titleEn: "atypica vs Traditional Research Agencies",
    category: "competitors",
    descriptionZh: "对比 atypica.AI 与传统调研公司在速度、成本、洞察深度等维度的差异",
    descriptionEn:
      "Compare atypica.AI with traditional research agencies in speed, cost, and insight depth",
    filePathZh: "docs/product/competitors/atypica-vs-traditional-research-zh.md",
    filePathEn: "docs/product/competitors/atypica-vs-traditional-research-en.md",
  },
  {
    slug: "atypica-vs-listen-labs",
    titleZh: "atypica vs Listen Labs",
    titleEn: "atypica vs Listen Labs",
    category: "competitors",
    descriptionZh: "对比 atypica.AI 与 Listen Labs 的产品定位、功能特性和技术优势",
    descriptionEn:
      "Compare atypica.AI with Listen Labs in product positioning, features, and technical advantages",
    filePathZh: "docs/product/competitors/atypica-vs-listen-labs-zh.md",
    filePathEn: "docs/product/competitors/atypica-vs-listen-labs-en.md",
  },

  // Guides
  {
    slug: "marketing-workflow",
    titleZh: "产品营销内容生产工作流",
    titleEn: "Product Marketing Content Production Workflow",
    category: "guides",
    descriptionZh: "从代码到产品理解，再到客观文档和营销内容的完整工作流",
    descriptionEn:
      "Complete workflow from code to product understanding, objective documentation, and marketing content",
    filePathZh: "docs/product/marketing-workflow-zh.md",
    filePathEn: "docs/product/marketing-workflow-en.md",
  },
  {
    slug: "user-research-journey",
    titleZh: "用户研究完整旅程",
    titleEn: "Complete User Research Journey",
    category: "guides",
    descriptionZh: "从意图澄清到最终报告，完整的 atypica.AI 用户研究流程示例",
    descriptionEn:
      "Complete atypica.AI user research process example from intent clarification to final report",
    filePathZh: "docs/product/user-research-journey-zh.md",
    filePathEn: "docs/product/user-research-journey-en.md",
  },
];

export const categoryLabels: Record<DocCategory, { zh: string; en: string }> = {
  features: { zh: "功能特性", en: "Features" },
  competitors: { zh: "竞品对比", en: "Competitors" },
  guides: { zh: "使用指南", en: "Guides" },
};

export function getDocBySlug(slug: string): Doc | undefined {
  return docs.find((doc) => doc.slug === slug);
}

export function getDocsByCategory(category: DocCategory): Doc[] {
  return docs.filter((doc) => doc.category === category);
}
