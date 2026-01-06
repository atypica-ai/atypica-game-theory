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
            "Concise research title starting with a relevant emoji, followed by the title text (15-40 Chinese characters, or 8-20 English words) that clearly expresses the research direction. Example: '🏕️ 露营经济的消费心理' or '🚗 EV Adoption Barriers'",
          ),
        description: z
          .string()
          .describe(
            "Detailed research brief (200-400 Chinese characters, or 100-200 English words). Must include specific trigger keywords to ensure Plan Mode selects the correct research methods shown in tags. For Focus Group: use words like 'bring together', 'discuss', 'debate', 'compare perspectives', 'weigh trade-offs'. For Deep Interview: use 'one-on-one interview', 'personal experience', 'decision journey'. For Social Observation: use 'observe social media', 'listen to conversations on [platform]'.",
          ),
        tags: z
          .array(z.string())
          .min(2)
          .max(3)
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
    .length(2)
    .describe(
      "Generate exactly 2 diverse and inspiring research scenarios for the target audience",
    ),
});

/**
 * Internal implementation to generate AI shortcuts
 */
async function _generateAIShortcutsImpl(batch: number, locale: Locale) {
  rootLogger.info(`Generating AI shortcuts for locale ${locale} ${batch}`);

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

3. **Tags 选择（必须使用中文）**
   - 可用的研究方法标签：社交观察、小红书观察、抖音观察、焦点小组、深度访谈、用户研究、网络调研、A/B 测试、人设构建、生成报告、播客生成、竞品分析
   - 每个场景选择 2-3 个标签，最后一个通常是输出类型（生成报告/播客生成）
   - 标签要能体现研究流程：观察/收集 → 分析/讨论 → 输出

4. **展示平台能力**
   - Tags 中的方法名是我们的"肌肉"（小红书观察、抖音观察、焦点小组、深度访谈）
   - 箭头流程让用户明白这是自动化的流程，不是需要选择的功能
   - 用具体品牌名（星巴克、Keep、特斯拉）让场景更真实

5. **天马行空但有价值**
   - 可以探索新兴趋势、跨界结合、未被充分研究的领域
   - 确保每个场景都有商业价值和研究意义
   - 涵盖不同行业：消费品、科技、服务、文化、健康等

6. **多样性和平衡**
   - 2个卡片应该针对目标角色的真实需求
   - 平衡新兴趋势和经典话题
   - 场景要符合该角色的工作场景和决策需求

# 输出要求
- Title 必须以一个相关的 emoji 开头
- 每个 description 必须 200-400 字，足够具体和丰富
- 确保 tags 和 description 的研究方法完全匹配
- 标题简洁有力，emoji + 10-20 个中文字`
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

3. **Tags Selection (Must Use English)**
   - Available research method tags: Social Listening, TikTok Scout, Instagram Scout, Twitter Scout, Focus Group, Deep Interview, User Research, Web Research, A/B Testing, Persona Building, Report, Podcast Generation, Competitive Analysis
   - Choose 2-3 tags per scenario, the last one is usually the output type (Report/Podcast Generation)
   - Tags should reflect research workflow: observe/collect → analyze/discuss → output

4. **Showcase Platform Capabilities**
   - Method names in tags are our "muscles" (TikTok Scout, Instagram Scout, Focus Group, Deep Interview)
   - Arrow flow shows users this is an automated process, not functions to choose from
   - Use specific brand names (Starbucks, Peloton, Tesla) to make scenarios real

5. **Creative Yet Valuable**
   - Explore emerging trends, cross-industry combinations, under-researched areas
   - Ensure each scenario has business value and research significance
   - Cover diverse industries: consumer goods, tech, services, culture, health, etc.

6. **Diversity and Balance**
   - 2 cards should address real needs of the target audience
   - Balance emerging trends with classic topics
   - Scenarios should fit the role's work context and decision-making needs

# Output Requirements
- Title must start with a relevant emoji
- Each description must be 100-200 words, specific and rich enough
- Ensure tags and description research methods perfectly match
- Title should be concise and powerful, emoji + 8-20 English words`;

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

  const audience = audienceMap[batch];
  const targetAudience = locale === "zh-CN" ? audience.zh : audience.en;
  const audienceContext = locale === "zh-CN" ? audience.context.zh : audience.context.en;

  const userPrompt =
    locale === "zh-CN"
      ? `请为【${targetAudience}】生成 2 个高质量的研究场景快捷卡片（批次 ${batch}）。

目标受众：${targetAudience}
工作场景：${audienceContext}

要求：
1. 每个场景都要针对${targetAudience}的真实工作需求和决策场景
2. 描述要足够长（200-400字），包含具体品牌、场景、探索维度
3. 确保 description 包含能触发 tags 中研究方法的关键词
4. 2个场景要有差异性：不同的研究类型或行业角度

天马行空，但要贴近${targetAudience}的实际需求！`
      : `Generate 2 high-quality research scenario shortcut cards for 【${targetAudience}】 (batch ${batch}).

Target Audience: ${targetAudience}
Work Context: ${audienceContext}

Requirements:
1. Each scenario should address real work needs and decision-making contexts of ${targetAudience}
2. Description should be long enough (100-200 words), including specific brands, scenarios, exploration dimensions
3. Ensure description includes keywords that trigger the research methods in tags
4. 2 scenarios should have diversity: different research types or industry angles

Be creative, but stay relevant to ${targetAudience}'s actual needs!`;

  const result = await generateObject({
    model: llm("claude-haiku-4-5"),
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

  rootLogger.info(`Generated AI shortcuts for locale ${locale} ${batch}`);

  return result.object.shortcuts;
}

/**
 * Cached version of AI shortcuts generation
 *
 * unstable_cache 原理：
 * - 函数参数会自动成为缓存key的一部分
 * - 实际缓存key: ["ai-generated-shortcuts", batch, locale]
 * - 不同的参数组合有独立的缓存项
 * - 缓存时间: 1天 (86400秒)
 *
 * 缓存清除：
 * 在需要清除缓存时使用: revalidateTag("ai-generated-shortcuts")
 */
const getCachedAIShortcuts = unstable_cache(
  async (batch: number, locale: Locale) => {
    return _generateAIShortcutsImpl(batch, locale);
  },
  ["ai-generated-shortcuts"],
  {
    revalidate: 86400, // 1 day cache
    tags: ["ai-generated-shortcuts"],
  },
);

/**
 * Server action to generate AI-powered research shortcuts
 * @param batch - Batch number (1-6) for different target audiences:
 *   1: Product Managers, 2: Marketers, 3: Startup Owners,
 *   4: Creators, 5: Consultants, 6: Influencers
 * @param locale - Locale for language-specific content
 */
export async function generateAIShortcuts(
  batch: 1 | 2 | 3 | 4 | 5 | 6,
  locale: Locale,
): Promise<ServerActionResult<StudyShortcut[]>> {
  try {
    const shortcuts = await getCachedAIShortcuts(batch, locale);

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
