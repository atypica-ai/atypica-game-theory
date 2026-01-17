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
    titleZh: "Fast Insight：播客优先自动化",
    titleEn: "Fast Insight: Podcast-First Automation",
    category: "features",
    descriptionZh: "从研究需求到播客内容，一条龙自动化，数小时完成",
    descriptionEn:
      "End-to-end automation from research needs to podcast content, completed in hours",
    filePathZh: "docs/product/features/fast-insight-agent-zh.md",
    filePathEn: "docs/product/features/fast-insight-agent-en.md",
  },
  {
    slug: "product-rnd-agent",
    titleZh: "Product R&D Agent：产品研发智能体",
    titleEn: "Product R&D Agent: Product Development Intelligence",
    category: "features",
    descriptionZh: "从市场趋势到用户需求，为产品创新提供全方位研究支持",
    descriptionEn:
      "Comprehensive research support for product innovation, from market trends to user needs",
    filePathZh: "docs/product/features/product-rnd-agent-zh.md",
    filePathEn: "docs/product/features/product-rnd-agent-en.md",
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
    slug: "atypica-vs-listen-labs",
    titleZh: "atypica vs Listen Labs",
    titleEn: "atypica vs Listen Labs",
    category: "competitors",
    descriptionZh: "AI 访谈工具 vs 多场景研究平台，都使用 AI 模拟用户进行研究",
    descriptionEn:
      "AI interview tool vs multi-scenario research platform, both using AI to simulate users",
    filePathZh: "docs/product/competitors/atypica-vs-listen-labs-zh.md",
    filePathEn: "docs/product/competitors/atypica-vs-listen-labs-en.md",
  },
  {
    slug: "atypica-vs-claude-projects",
    titleZh: "atypica vs Claude Projects",
    titleEn: "atypica vs Claude Projects",
    category: "competitors",
    descriptionZh: "通用知识助手 vs 商业研究智能体，同样基于 Claude 但定位不同",
    descriptionEn:
      "General knowledge assistant vs business research agent, both built on Claude but different positioning",
    filePathZh: "docs/product/competitors/atypica-vs-claude-projects-zh.md",
    filePathEn: "docs/product/competitors/atypica-vs-claude-projects-en.md",
  },
  {
    slug: "atypica-vs-usertesting",
    titleZh: "atypica vs UserTesting",
    titleEn: "atypica vs UserTesting",
    category: "competitors",
    descriptionZh: "真人测试平台 vs AI 研究加速器，节省 80-85% 成本",
    descriptionEn: "Real human testing platform vs AI research accelerator, save 80-85% cost",
    filePathZh: "docs/product/competitors/atypica-vs-usertesting-zh.md",
    filePathEn: "docs/product/competitors/atypica-vs-usertesting-en.md",
  },
  {
    slug: "atypica-vs-surveymonkey",
    titleZh: "atypica vs SurveyMonkey",
    titleEn: "atypica vs SurveyMonkey",
    category: "competitors",
    descriptionZh: "量化问卷调研 vs 质性对话研究，理解'为什么' vs '多少人'",
    descriptionEn:
      "Quantitative survey research vs qualitative conversational research, 'why' vs 'how many'",
    filePathZh: "docs/product/competitors/atypica-vs-surveymonkey-zh.md",
    filePathEn: "docs/product/competitors/atypica-vs-surveymonkey-en.md",
  },
  {
    slug: "atypica-vs-notebooklm",
    titleZh: "atypica vs NotebookLM",
    titleEn: "atypica vs NotebookLM",
    category: "competitors",
    descriptionZh: "文档播客生成 vs 研究+播客平台，被动转化 vs 主动研究",
    descriptionEn:
      "Document-to-podcast generation vs research + podcast platform, passive conversion vs active research",
    filePathZh: "docs/product/competitors/atypica-vs-notebooklm-zh.md",
    filePathEn: "docs/product/competitors/atypica-vs-notebooklm-en.md",
  },
  {
    slug: "atypica-vs-otter-ai",
    titleZh: "atypica vs Otter.ai",
    titleEn: "atypica vs Otter.ai",
    category: "competitors",
    descriptionZh: "会议转录 vs 用户研究，记录'说了什么' vs 理解'为什么'",
    descriptionEn:
      "Meeting transcription vs user research, recording 'what was said' vs understanding 'why'",
    filePathZh: "docs/product/competitors/atypica-vs-otter-ai-zh.md",
    filePathEn: "docs/product/competitors/atypica-vs-otter-ai-en.md",
  },
  {
    slug: "atypica-vs-traditional-research",
    titleZh: "atypica vs 传统调研方法",
    titleEn: "atypica vs Traditional Research",
    category: "competitors",
    descriptionZh: "AI 模拟 vs 真人招募，数小时 vs 数周",
    descriptionEn: "AI simulation vs human recruitment, hours vs weeks",
    filePathZh: "docs/product/competitors/atypica-vs-traditional-research-zh.md",
    filePathEn: "docs/product/competitors/atypica-vs-traditional-research-en.md",
  },

  // Guides
  {
    slug: "getting-started",
    titleZh: "atypica.AI 用户研究旅程",
    titleEn: "atypica.AI User Research Journey",
    category: "guides",
    descriptionZh: "通过气泡咖啡案例，完整展示用户如何使用 atypica.AI 完成商业研究的全过程",
    descriptionEn:
      "Complete demonstration of how users conduct business research with atypica.AI through a real-world scenario",
    filePathZh: "docs/product/guides/getting-started-zh.md",
    filePathEn: "docs/product/guides/getting-started-en.md",
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
