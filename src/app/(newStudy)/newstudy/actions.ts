"use server";

import { llm } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { generateObject } from "ai";
import { Locale } from "next-intl";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { StudyShortcut } from "./config/shortcuts";

// Schema for generated shortcuts
const generatedShortcutsSchema = z.object({
  shortcuts: z
    .array(
      z.object({
        title: z
          .string()
          .describe(
            "Concise and natural research title starting with a relevant emoji, followed by the title text (12-30 Chinese characters, or 6-15 English words) that clearly expresses the research direction. AVOID formulaic patterns like '角色专题：'. Use natural, engaging language. Good examples: '🏕️ 露营装备的使用场景创新', '☕ 咖啡消费决策中的情感因素', '🚗 电动车购买的真实顾虑'. Bad examples: '产品经理专题：XX', 'XX人员专题：YY'.",
          ),
        description: z
          .string()
          .describe(
            "Detailed research brief (200-400 Chinese characters, or 100-200 English words). Must include specific trigger keywords to ensure Plan Mode selects the correct research methods shown in tags. For Focus Group: use words like 'bring together', 'discuss', 'debate', 'compare perspectives', 'weigh trade-offs'. For Deep Interview: use 'one-on-one interview', 'personal experience', 'decision journey'. For Social Observation: use 'observe social media', 'listen to conversations on [platform]'.",
          ),
        tags: z
          .array(z.string())
          .describe(
            "2-3 research method tags that describe the research workflow. Must match the language of the content (Chinese tags for Chinese scenarios, English tags for English scenarios). The last tag should usually be the final output type.",
          ),
        category: z
          .enum([
            "product-testing",
            "persona-building",
            "content-generation",
            "deep-interview",
            "market-analysis",
          ])
          .describe("Research category that best fits this study"),
      }),
    )
    .describe(
      "Generate exactly 12 diverse and inspiring research scenarios. MUST cover all 6 target audiences (Product Managers, Marketers, Startup Owners, Creators, Consultants, Influencers) with at least 1 scenario each. Remaining scenarios can explore diverse topics and industries.",
    ),
});

/**
 * Internal implementation to generate AI shortcuts
 */
async function _generateAIShortcutsImpl(locale: Locale) {
  rootLogger.info(`Generating AI shortcuts for locale ${locale}`);

  const systemPrompt =
    locale === "zh-CN"
      ? `你是 atypica.AI 的研究灵感助手，负责生成高质量的研究场景快捷卡片。

# 核心使命
帮助用户快速开始有价值的商业研究，通过精心设计的"灵感起点"激发他们的研究兴趣。

# 设计原则（关键！）

1. **灵感起点，而非完整模板**
   - 标题要抽象但清晰，不要过于具体到"跑别人的研究"
   - 描述要丰富具体，给用户清晰的场景和探索方向
   - 留出空间让 Plan Mode 后续澄清细节

2. **精心设计 Brief 以触发研究方法**
   - 如果 tags 包含"焦点小组"，description 必须包含：召集/组织/讨论/辩论/对比/权衡/群体共识
   - 如果 tags 包含"深度访谈"，description 必须包含：一对一访谈/个人经历/决策历程/真实故事
   - 如果 tags 包含"社交观察"，description 必须明确提到：观察小红书/抖音/社交媒体

3. **精心设计 Brief 以触发正确的 Agent 类型**
   **重要**：Brief 的措辞会影响 Plan Mode 选择哪个执行 Agent，请根据场景特征自然融入关键词：

   🎙️ **Fast Insight Agent** - 快速内容生成（播客优先）
   - 适用场景：时事热点、商业趋势、快速洞察、内容营销
   - 触发词：播客、快速、热点、最新动态、解读、介绍
   - Brief 示例："快速分析最近的AI Agent发展趋势，生成一期播客..."

   🎨 **Product R&D Agent** - 产品创新机会发现
   - 适用场景：产品功能创新、包装设计、营销策略、场景拓展
   - 触发词：创新、灵感、新产品、社交趋势、功能创新、场景创新、包装设计
   - Brief 示例："为露营装备寻找使用场景创新机会，观察小红书上年轻人的新玩法..."

   🧠 **Study Agent** - 深度商业研究（AI人设模拟）
   - 适用场景：用户行为研究、决策分析、产品测试、策略规划
   - 触发词：了解、发现、比较、测试、设计方案、制定策略
   - Brief 示例："深入了解一线城市白领对精品咖啡的消费决策因素，通过一对一访谈..."

   **选择策略**：
   - 根据目标角色的需求，自然选择合适的 Agent 类型
   - 确保 description 中自然包含对应的触发词
   - 播客/快速内容 → Fast Insight；产品创新 → Product R&D；深度研究 → Study

4. **Tags 选择（必须使用中文）**
   - 可用的研究方法标签：社交观察、小红书观察、抖音观察、焦点小组、深度访谈、用户研究、网络调研、A/B 测试、人设构建、生成报告、播客生成、竞品分析
   - 每个场景选择 2-3 个标签，最后一个通常是输出类型（生成报告/播客生成）
   - 标签要能体现研究流程：观察/收集 → 分析/讨论 → 输出

5. **展示平台能力**
   - Tags 中的方法名是我们的"肌肉"（小红书观察、抖音观察、焦点小组、深度访谈）
   - 箭头流程让用户明白这是自动化的流程，不是需要选择的功能
   - 用具体品牌名（星巴克、Keep、特斯拉）让场景更真实

6. **天马行空但有价值**
   - 可以探索新兴趋势、跨界结合、未被充分研究的领域
   - 确保每个场景都有商业价值和研究意义
   - 涵盖不同行业：消费品、科技、服务、文化、健康等

7. **多样性和平衡**
   - 12个卡片必须覆盖所有六个目标角色（产品经理、营销人员、创业者、创作者、咨询顾问、KOL/网红），每个角色至少1个
   - **输出类型平衡**：避免全是"生成报告"，应该包含：
     * 3-4个"播客生成"场景（快速洞察/热点分析/趋势解读）
     * 6-7个"生成报告"场景（深度研究/用户访谈/焦点小组）
     * 1-2个其他类型（人设构建/竞品分析等）
   - 剩余卡片自由发散，探索不同行业、新兴趋势、跨界结合
   - 平衡新兴趋势和经典话题
   - 每个场景要符合目标角色的工作场景和决策需求

# 输出要求
- Title 必须以一个相关的 emoji 开头
- Title 要自然、直接、有吸引力，**避免**使用"xxx专题："、"xxx人员："这类生硬格式
- Title 长度：emoji + 12-30 个中文字（或 6-15 个英文单词）
- Title 示例（好）：🏕️ 露营装备的使用场景创新、☕ 咖啡消费决策中的情感因素
- Title 示例（差）：🎯 产品经理专题：XX功能创新、📱 营销人员专题：XX策略
- 每个 description 必须 200-400 字，足够具体和丰富
- 确保 tags 和 description 的研究方法完全匹配`
      : `You are atypica.AI's research inspiration assistant, responsible for generating high-quality research scenario shortcut cards.

# Core Mission
Help users quickly start valuable business research by providing carefully designed "inspiration starters" that spark their research interests.

# Design Principles (Critical!)

1. **Inspiration Starters, Not Complete Templates**
   - Titles should be abstract yet clear, not overly specific to feel like "running someone else's research"
   - Descriptions should be rich and specific, giving users clear scenarios and exploration directions
   - Leave room for Plan Mode to clarify details later

2. **Carefully Design Briefs to Trigger Research Methods**
   - If tags include "Focus Group", description MUST include: bring together/facilitate/discuss/debate/compare/weigh trade-offs/group consensus
   - If tags include "Deep Interview", description MUST include: one-on-one interview/personal experience/decision journey/real stories
   - If tags include "Social Listening", description MUST explicitly mention: observe Twitter/Instagram/TikTok/social media

3. **Carefully Design Briefs to Trigger Correct Agent Type**
   **Important**: Brief wording affects which execution Agent Plan Mode selects. Naturally incorporate keywords based on scenario characteristics:

   🎙️ **Fast Insight Agent** - Quick content generation (podcast-first)
   - Use cases: Hot topics, business trends, quick insights, content marketing
   - Trigger words: podcast, quick, hot topic, latest updates, explain, introduce
   - Brief example: "Quickly analyze the latest AI Agent development trends and generate a podcast..."

   🎨 **Product R&D Agent** - Product innovation opportunity discovery
   - Use cases: Product feature innovation, packaging design, marketing strategy, scenario expansion
   - Trigger words: innovation, inspiration, new product, social trends, feature innovation, scenario innovation, packaging design
   - Brief example: "Find usage scenario innovation opportunities for camping gear by observing new ways young people play on Instagram..."

   🧠 **Study Agent** - Deep business research (AI persona simulation)
   - Use cases: User behavior research, decision analysis, product testing, strategy planning
   - Trigger words: understand, discover, compare, test, design solution, develop strategy
   - Brief example: "Deeply understand the coffee consumption decision factors of white-collar workers in tier-1 cities through one-on-one interviews..."

   **Selection Strategy**:
   - Naturally choose appropriate Agent type based on target audience needs
   - Ensure description naturally includes corresponding trigger words
   - Podcast/quick content → Fast Insight; Product innovation → Product R&D; Deep research → Study

4. **Tags Selection (Must Use English)**
   - Available research method tags: Social Listening, TikTok Scout, Instagram Scout, Twitter Scout, Focus Group, Deep Interview, User Research, Web Research, A/B Testing, Persona Building, Report, Podcast Generation, Competitive Analysis
   - Choose 2-3 tags per scenario, the last one is usually the output type (Report/Podcast Generation)
   - Tags should reflect research workflow: observe/collect → analyze/discuss → output

5. **Showcase Platform Capabilities**
   - Method names in tags are our "muscles" (TikTok Scout, Instagram Scout, Focus Group, Deep Interview)
   - Arrow flow shows users this is an automated process, not functions to choose from
   - Use specific brand names (Starbucks, Peloton, Tesla) to make scenarios real

6. **Creative Yet Valuable**
   - Explore emerging trends, cross-industry combinations, under-researched areas
   - Ensure each scenario has business value and research significance
   - Cover diverse industries: consumer goods, tech, services, culture, health, etc.

7. **Diversity and Balance**
   - 12 cards MUST cover all 6 target audiences (Product Managers, Marketers, Startup Owners, Creators, Consultants, Influencers) with at least 1 each
   - **Output type balance**: Avoid all "Report" outputs. Should include:
     * 3-4 "Podcast Generation" scenarios (quick insights/hot topic analysis/trend explanations)
     * 6-7 "Report" scenarios (deep research/user interviews/focus groups)
     * 1-2 other types (persona building/competitive analysis etc.)
   - Remaining cards can freely explore diverse industries, emerging trends, cross-sector combinations
   - Balance emerging trends with classic topics
   - Each scenario should fit the target role's work context and decision-making needs

# Output Requirements
- Title must start with a relevant emoji
- Title should be natural, direct, and engaging. **AVOID** formulaic patterns like "For Product Managers:", "Marketers Special:"
- Title length: emoji + 6-15 English words (or 12-30 Chinese characters)
- Title examples (good): 🏕️ Camping Gear Usage Innovation, ☕ Emotional Factors in Coffee Decisions
- Title examples (bad): 🎯 Product Manager Special: XX Innovation, 📱 For Marketers: XX Strategy
- Each description must be 100-200 words, specific and rich enough
- Ensure tags and description research methods perfectly match`;

  // Define target audience for each batch
  const audienceMap: Record<
    number,
    { zh: string; en: string; context: { zh: string; en: string } }
  > = {
    1: {
      zh: "产品经理",
      en: "Product Managers",
      context: {
        zh: "关注用户需求、产品功能、市场定位、竞品分析、用户体验优化",
        en: "Focus on user needs, product features, market positioning, competitive analysis, UX optimization",
      },
    },
    2: {
      zh: "营销人员",
      en: "Marketers",
      context: {
        zh: "关注品牌传播、营销策略、用户增长、内容营销、转化率优化",
        en: "Focus on brand communication, marketing strategy, user growth, content marketing, conversion optimization",
      },
    },
    3: {
      zh: "创业者",
      en: "Startup Owners",
      context: {
        zh: "关注市场机会、商业模式、用户痛点、融资故事、增长策略",
        en: "Focus on market opportunities, business models, user pain points, funding stories, growth strategies",
      },
    },
    4: {
      zh: "创作者",
      en: "Creators",
      context: {
        zh: "关注内容趋势、受众偏好、平台算法、变现方式、社区运营",
        en: "Focus on content trends, audience preferences, platform algorithms, monetization, community management",
      },
    },
    5: {
      zh: "咨询顾问",
      en: "Consultants",
      context: {
        zh: "关注行业洞察、战略咨询、客户需求、案例研究、解决方案",
        en: "Focus on industry insights, strategic consulting, client needs, case studies, solutions",
      },
    },
    6: {
      zh: "KOL/网红",
      en: "Influencers",
      context: {
        zh: "关注粉丝互动、内容传播、品牌合作、个人品牌、流量变现",
        en: "Focus on fan engagement, content virality, brand partnerships, personal branding, monetization",
      },
    },
  };

  // Build audience context for all 6 roles
  const allAudiencesContext =
    locale === "zh-CN"
      ? Object.values(audienceMap)
          .map((a) => `• ${a.zh}：${a.context.zh}`)
          .join("\n")
      : Object.values(audienceMap)
          .map((a) => `• ${a.en}: ${a.context.en}`)
          .join("\n");

  const userPrompt =
    locale === "zh-CN"
      ? `请生成 12 个高质量的研究场景快捷卡片。

目标受众（必须覆盖所有6个角色，每个至少1个）：
${allAudiencesContext}

要求：
1. **覆盖所有角色**：产品经理、营销人员、创业者、创作者、咨询顾问、KOL/网红，每个角色至少1个场景
2. **输出类型平衡**：
   - 3-4个场景以"播客生成"结尾（适合快速洞察、热点解读、趋势分析）
   - 6-7个场景以"生成报告"结尾（适合深度研究、用户访谈、焦点小组）
   - 1-2个场景可以用其他输出类型
3. **剩余场景自由发散**：可以探索不同行业、新兴趋势、跨界结合，不必拘泥于6个角色
4. **标题自然直接**：**绝不使用**"产品经理专题："、"营销人员专题："这类格式，用自然的研究主题描述
5. **描述丰富**：每个 description 必须 200-400 字，包含具体品牌、场景、探索维度
6. **触发词匹配**：确保 description 包含能触发 tags 中研究方法和 Agent 类型的关键词
7. **场景多样性**：涵盖不同的研究类型（快速洞察/产品创新/深度研究）、行业（消费/科技/文化/健康等）

天马行空，但每个场景都要有明确的商业价值和研究意义！

**标题示例（正确）**：
- 🏕️ 露营装备的使用场景创新
- ☕ 一线城市白领的咖啡消费决策
- 🎮 游戏内购的心理触发机制

**标题示例（错误，不要模仿）**：
- 🎯 产品经理专题：功能创新研究
- 📱 营销人员专题：转化率提升`
      : `Generate 12 high-quality research scenario shortcut cards.

Target Audiences (MUST cover all 6 roles with at least 1 each):
${allAudiencesContext}

Requirements:
1. **Cover all roles**: Product Managers, Marketers, Startup Owners, Creators, Consultants, Influencers - at least 1 scenario for each
2. **Output type balance**:
   - 3-4 scenarios ending with "Podcast Generation" (suitable for quick insights, hot topic analysis, trend explanations)
   - 6-7 scenarios ending with "Report" (suitable for deep research, user interviews, focus groups)
   - 1-2 scenarios can use other output types
3. **Freely explore with remaining scenarios**: Can explore diverse industries, emerging trends, cross-sector combinations beyond the 6 roles
4. **Natural and direct titles**: **NEVER use** formats like "For Product Managers:", "Marketers Special:". Use natural research topic descriptions
5. **Rich descriptions**: Each description must be 100-200 words, including specific brands, scenarios, exploration dimensions
6. **Keyword matching**: Ensure description includes trigger keywords for research methods in tags and Agent types
7. **Scenario diversity**: Cover different research types (quick insights/product innovation/deep research), industries (consumer/tech/culture/health etc.)

Be creative but ensure each scenario has clear business value and research significance!

**Title examples (correct)**:
- 🏕️ Camping Gear Usage Innovation
- ☕ Coffee Consumption Decisions in Tier-1 Cities
- 🎮 Psychological Triggers in Game Purchases

**Title examples (wrong, don't imitate)**:
- 🎯 Product Manager Special: Feature Innovation
- 📱 For Marketers: Conversion Rate Boost`;

  const result = await generateObject({
    model: llm("claude-sonnet-4-5"),
    // providerOptions: {
    //   openai: {
    //     reasoningSummary: "auto",
    //     reasoningEffort: "minimal",
    //   } satisfies OpenAIResponsesProviderOptions,
    // },
    schema: generatedShortcutsSchema,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  rootLogger.info(`Generated AI shortcuts for locale ${locale}`);

  return result.object.shortcuts;
}

/**
 * Cached version of AI shortcuts generation
 *
 * unstable_cache 原理：
 * - 函数参数会自动成为缓存key的一部分
 * - 实际缓存key: ["ai-generated-shortcuts", locale]
 * - 不同的参数组合有独立的缓存项
 * - 缓存时间: 1天 (86400秒)
 *
 * 缓存清除：
 * 在需要清除缓存时使用: revalidateTag("ai-generated-shortcuts")
 */
const getCachedAIShortcuts = unstable_cache(
  async (locale: Locale) => {
    return _generateAIShortcutsImpl(locale);
  },
  ["ai-generated-shortcuts"],
  {
    revalidate: 86400, // 1 day cache
    tags: ["ai-generated-shortcuts"],
  },
);

/**
 * Server action to generate AI-powered research shortcuts
 * Generates 12 shortcuts covering all 6 target audiences:
 * Product Managers, Marketers, Startup Owners, Creators, Consultants, Influencers
 *
 * @param locale - Locale for language-specific content
 */
export async function generateAIShortcuts(
  locale: Locale,
): Promise<ServerActionResult<StudyShortcut[]>> {
  try {
    const shortcuts = await getCachedAIShortcuts(locale);

    return {
      success: true,
      data: shortcuts,
    };
  } catch (error) {
    console.error("Failed to generate AI shortcuts:", error);
    return {
      success: false,
      message: "Failed to generate research scenarios",
      code: "internal_server_error",
    };
  }
}
