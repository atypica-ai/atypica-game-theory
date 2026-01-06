"use server";

import { llm } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
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
    .length(4)
    .describe("Generate exactly 4 diverse and inspiring research scenarios"),
});

/**
 * Internal implementation to generate AI shortcuts
 */
async function _generateAIShortcutsImpl(batch: number, locale: Locale) {
  rootLogger.info(`Generating ${batch} AI shortcuts for locale ${locale}`);

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
   - 4个卡片应该覆盖不同行业和研究类型
   - 平衡新兴趋势和经典话题
   - 既有 B2C 也可以有 B2B 场景

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
   - 4 cards should cover different industries and research types
   - Balance emerging trends with classic topics
   - Include both B2C and possibly B2B scenarios

# Output Requirements
- Title must start with a relevant emoji
- Each description must be 100-200 words, specific and rich enough
- Ensure tags and description research methods perfectly match
- Title should be concise and powerful, emoji + 8-20 English words`;

  const userPrompt =
    locale === "zh-CN"
      ? `请生成 4 个高质量的研究场景快捷卡片（批次 ${batch}）。

要求：
1. 每个场景都要独特、有创意、有商业价值
2. 描述要足够长（200-400字），包含具体品牌、场景、探索维度
3. 确保 description 包含能触发 tags 中研究方法的关键词
4. 4个场景要有多样性：不同行业、不同研究类型

可以探索的方向（不限于此）：
- 新兴消费趋势（露营、飞盘、围炉煮茶）
- 科技产品采用（AI工具、智能家居、电动车）
- 代际差异研究（Z世代、银发族、职场人）
- 生活方式变迁（远程办公、精致穷、松弛感）
- 跨界创新机会（国货美妆、新茶饮、户外品牌）
- 社交媒体趋势（小红书种草、抖音电商、B站文化）

天马行空，但要有洞察价值！`
      : `Please generate 4 high-quality research scenario shortcut cards (batch ${batch}).

Requirements:
1. Each scenario should be unique, creative, and have business value
2. Description should be long enough (100-200 words), including specific brands, scenarios, exploration dimensions
3. Ensure description includes keywords that trigger the research methods in tags
4. 4 scenarios should have diversity: different industries, different research types

Directions to explore (not limited to):
- Emerging consumer trends (outdoor activities, wellness tech, sustainable living)
- Technology adoption (AI tools, smart home, EV adoption)
- Generational differences (Gen Z, Millennials, Boomers, professionals)
- Lifestyle shifts (remote work, digital nomads, minimalism)
- Cross-industry innovation (DTC brands, subscription services, creator economy)
- Social media trends (TikTok commerce, Instagram communities, Twitter discourse)

Be creative, but ensure valuable insights!`;

  const result = await generateObject({
    model: llm("gpt-5-mini"),
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
        reasoningEffort: "minimal",
      } satisfies OpenAIResponsesProviderOptions,
    },
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

  rootLogger.info(`Generated ${result.object.shortcuts.length} AI shortcuts for locale ${locale}`);

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
 * @param batch - Batch number (1-3) to distinguish different sets
 * @param locale - Locale for language-specific content
 */
export async function generateAIShortcuts(
  batch: 1 | 2 | 3,
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
