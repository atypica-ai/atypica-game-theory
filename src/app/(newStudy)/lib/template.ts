import "server-only";

import { llm } from "@/ai/provider";
import { loadUserMemory } from "@/app/(memory)/lib/loadMemory";
import { StudyShortcut } from "@/app/(newStudy)/newstudy/config/shortcuts";
import { rootLogger } from "@/lib/logging";
import { ResearchTemplateExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateObject } from "ai";
import { Locale } from "next-intl";
import { revalidateTag } from "next/cache";
import { generatedShortcutsSchema } from "./schema";

type GenerateResult =
  | number
  | {
      count: number;
      templates: StudyShortcut[];
    };

/**
 * Internal function to generate AI shortcuts
 * Used by generatePublicTemplates to create research templates
 * @param locale - Language locale
 * @param count - Number of shortcuts to generate (default: 12)
 */
async function generateAIShortcutsWithAI(locale: Locale, count = 12): Promise<StudyShortcut[]> {
  rootLogger.info({ msg: "Generating AI shortcuts with AI", locale, count });

  const systemPrompt =
    locale === "zh-CN"
      ? `你是 atypica.AI 的研究灵感助手。你的任务是生成让人看了就想试试的研究主题卡片。

# 什么是好的研究主题？

好的研究主题让人：
✅ 眼前一亮："咦，这个角度有意思"
✅ 有代入感："这确实是我会遇到的问题"
✅ 想马上开始："我正好想了解这个"
✅ 看到可能性："用这个方法好像能发现点什么"

避免的研究主题让人：
❌ 没有新意："又是咖啡/健身/AI工具/电动车..."
❌ 感觉是别人的："这是给某某人的研究，不是给我的"
❌ 太像 PPT："用户留存、转化率优化、增长黑客..."
❌ 看不到场景："概念太大了，不知道从哪开始"

# 探索的方向

把镜头对准那些**正在发生但还没被说烂**的事情：
- 刚刚冒头的趋势，主流还没跟上
- 小众但有深度的垂直领域
- 反直觉的视角，挑战常识的角度
- 不同领域碰撞出的新可能
- 专业领域的真实困境，不是空洞套话

覆盖不同的场景类型：
- 有些场景适合快速了解一个话题（比如商业趋势、热点解读）
- 有些场景需要深入挖掘用户决策（比如为什么买、为什么不买）
- 有些场景是找产品创新机会（比如新功能、新场景、新包装）

# 如何描述一个研究场景

**标题**：
- 用 emoji + 直接的主题（12-30个字）
- 自然、吸引人，不要"XX人员专题"这种格式
- 例如：🎭 剧本杀创作者的IP困境、🏪 便利店选址的隐性规则

**描述**（100-150字）：
- 第一句话说清楚要研究什么
- 用具体的品牌、场景、人群让用户有代入感
- 提到会用什么方式去研究（观察社交媒体？一对一访谈？还是组织讨论？）
- 点出能发现什么、对谁有用，但不要展开太细

重要的是：
- 说清楚场景，不是讲研究方法
- 给探索方向，不是列要点步骤
- 让用户感觉"这个我想试试"，而不是"我知道该怎么做"

**标签**（tags）：
- 可用标签：社交观察、小红书观察、抖音观察、焦点小组、深度访谈、用户研究、网络调研、A/B 测试、人设构建、生成报告、播客生成、竞品分析
- 选 2-3 个标签，体现研究的流程（观察/收集 → 分析/讨论 → 输出）
- 最后一个标签通常是输出类型：生成报告（深度研究）或播客生成（快速洞察）

# 注意保持多样性

不要全是互联网、消费品的话题，也关注：
- 文化创意、专业服务、社会议题、垂直社区
- B2B 的专业场景，不只是 C 端产品
- 不同决策场景：有人在选产品，有人在做内容，有人在找机会

输出类型也要平衡：
- 大约 30% 适合快速生成播客（商业趋势、热点解读）
- 大约 55% 适合深度研究报告（用户访谈、焦点小组）
- 剩下的可以是其他类型（人设构建、竞品分析等）`
      : `You are atypica.AI's research inspiration assistant. Your job is to create research topic cards that make people want to try them right away.

# What Makes a Good Research Topic?

Good research topics make people feel:
✅ Intrigued: "Oh, this is an interesting angle"
✅ Relatable: "This is actually a problem I face"
✅ Eager to start: "I've been wanting to understand this"
✅ Possibility: "This method might uncover something valuable"

Topics to avoid make people feel:
❌ Unoriginal: "Not coffee/fitness/AI tools/EVs again..."
❌ Not for me: "This is someone else's research, not mine"
❌ Too corporate: "User retention, conversion optimization, growth hacking..."
❌ Too vague: "The concept is too broad, where do I even start"

# Exploration Directions

Point the lens at things that are **happening now but not yet overdiscussed**:
- Just-emerging trends the mainstream hasn't caught up with
- Niche but deep vertical domains
- Counter-intuitive perspectives that challenge assumptions
- New possibilities from cross-domain collisions
- Real dilemmas in professional fields, not empty buzzwords

Cover different scenario types:
- Some scenarios are for quickly understanding a topic (business trends, hot topic analysis)
- Some need deep dives into user decisions (why buy, why not buy)
- Some are for finding product innovation opportunities (new features, new use cases, new packaging)

# How to Describe a Research Scenario

**Title**:
- Use emoji + direct topic (6-15 words)
- Natural and engaging, avoid "For XX Professionals" format
- Examples: 🎭 IP Dilemmas for Murder Mystery Writers, 🏪 Hidden Rules of Convenience Store Location

**Description** (100-150 words):
- First sentence: clearly state what to research
- Use specific brands, scenarios, and audiences for relatability
- Mention the research approach (social media observation? one-on-one interviews? group discussions?)
- Hint at what can be discovered and who it's useful for, but don't elaborate too much

What matters:
- Describe the scenario, not the research methodology
- Give exploration directions, not step-by-step procedures
- Make users feel "I want to try this" rather than "I know what to do"

**Tags**:
- Available tags: Social Listening, TikTok Scout, Instagram Scout, Twitter Scout, Focus Group, Deep Interview, User Research, Web Research, A/B Testing, Persona Building, Report, Podcast Generation, Competitive Analysis
- Choose 2-3 tags reflecting research workflow (observe/collect → analyze/discuss → output)
- Last tag is usually output type: Report (deep research) or Podcast Generation (quick insights)

# Keep It Diverse

Don't make everything about internet companies or consumer products. Also cover:
- Creative culture, professional services, social issues, vertical communities
- B2B professional scenarios, not just C-side products
- Different decision contexts: some are choosing products, some creating content, some seeking opportunities

Balance output types:
- About 30% suitable for quick podcast generation (business trends, hot topic analysis)
- About 55% suitable for deep research reports (user interviews, focus groups)
- Remaining can be other types (persona building, competitive analysis, etc.)`;

  // Define target audience for all 6 roles
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

  // Calculate output type distribution
  const podcastCount = Math.round(count * 0.3);
  const reportCount = Math.round(count * 0.55);
  // const otherCount = count - podcastCount - reportCount;

  const userPrompt =
    locale === "zh-CN"
      ? `请生成 ${count} 个研究场景卡片。

这些场景会给不同的人用：
${allAudiencesContext}

注意：
- 覆盖不同的人群和场景，别都扎堆在一个领域
- 有的场景适合快速生成播客（大约 ${podcastCount} 个），有的适合深度研究报告（大约 ${reportCount} 个）
- 每个主题都要有点意思，让人看了想试试
- 描述 100-150 字就够了，说清楚要研究什么、怎么研究、能发现什么

开始吧！`
      : `Generate ${count} research scenario cards.

These scenarios will be used by different people:
${allAudiencesContext}

Note:
- Cover diverse audiences and scenarios, don't cluster in one domain
- Some scenarios suit quick podcast generation (about ${podcastCount}), some suit deep research reports (about ${reportCount})
- Make each topic interesting enough that people want to try it
- Descriptions of 100-150 words are sufficient - explain what to research, how to research, and what can be discovered

Let's go!`;

  const result = await generateObject({
    model: llm("gpt-5.2"),
    schema: generatedShortcutsSchema,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  rootLogger.info({
    msg: "Generated AI shortcuts with AI",
    locale,
    count: result.object.shortcuts.length,
  });

  return result.object.shortcuts;
}

/**
 * 生成公共研究模板
 *
 * @param locale - 语言
 * @param replaceExisting - 是否删除现有公共模板
 * @param dryRun - 测试模式，生成但不保存到数据库
 * @param count - 生成模板数量（默认: 12）
 * @returns 生成的模板数量（dryRun 时返回生成的数据）
 */
export async function generatePublicTemplates(
  locale: Locale,
  replaceExisting = false,
  dryRun = false,
  count = 12,
): Promise<GenerateResult> {
  const logger = rootLogger.child({ fn: "generatePublicTemplates", locale, count });

  logger.info({ msg: "Starting to generate public templates", replaceExisting, count });

  try {
    // 如果需要，删除现有公共模板
    if (replaceExisting) {
      const deleted = await prisma.researchTemplate.deleteMany({
        where: {
          locale,
          userId: null,
          teamId: null,
        },
      });
      logger.info({ msg: "Deleted existing public templates", count: deleted.count });
    }

    // 调用 AI 生成
    const shortcuts = await generateAIShortcutsWithAI(locale, count);

    // DryRun 模式：生成但不保存
    if (dryRun) {
      logger.info({
        msg: "Dry run mode: generated templates but not saving",
        count: shortcuts.length,
      });
      return {
        count: shortcuts.length,
        templates: shortcuts,
      };
    }

    // 保存到数据库
    const templates = await prisma.$transaction(
      shortcuts.map((shortcut) =>
        prisma.researchTemplate.create({
          data: {
            title: shortcut.title,
            description: shortcut.description,
            locale,
            userId: null,
            teamId: null,
            extra: {
              tags: shortcut.tags,
            } satisfies ResearchTemplateExtra,
          },
        }),
      ),
    );

    logger.info({ msg: "Successfully generated public templates", count: templates.length });

    // 清除缓存，让新模板立即在前端可见
    revalidateTag("research-templates");

    return templates.length;
  } catch (error) {
    logger.error({
      msg: "Failed to generate public templates",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * 生成个人研究模板
 *
 * 基于用户的 Memory 和研究历史（Analyst studyLog）生成个性化模板
 *
 * @param userId - 用户 ID
 * @param locale - 语言
 * @param count - 生成模板数量（默认: 根据数据丰富程度自动调整 6-12 个）
 * @returns 生成的模板数量
 */
export async function generatePersonalTemplates(
  userId: number,
  locale: Locale,
  count?: number,
): Promise<number> {
  const logger = rootLogger.child({ fn: "generatePersonalTemplates", userId, locale, count });

  logger.info({ msg: "Starting to generate personal templates" });

  try {
    // 1. 获取用户 Memory
    const memoryCore = await loadUserMemory(userId);

    // 2. 获取用户最近的研究历史
    const recentStudies = await prisma.userChat.findMany({
      where: {
        userId,
        kind: "study",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        token: true,
        context: true,
        extra: true,
      },
    });

    logger.info({
      msg: "Retrieved user context",
      hasMemory: !!memoryCore,
      studyCount: recentStudies.length,
    });

    // 3. 根据用户数据丰富程度自动调整数量（如果未指定）
    if (!count) {
      const hasRichData = memoryCore && memoryCore.length > 500;
      const hasRichHistory = recentStudies.length >= 5;
      count = hasRichData || hasRichHistory ? 12 : 6;
      logger.info({ msg: "Auto-adjusted template count", count, hasRichData, hasRichHistory });
    }

    // 4. 构建 AI prompt
    const systemPrompt =
      locale === "zh-CN"
        ? `你是 atypica.AI 的个性化研究助手。基于用户的记忆和研究历史，生成 ${count} 个高度个性化的研究场景模板。

## 用户背景

### 用户记忆（核心兴趣和偏好）
${memoryCore || "无"}

### 最近研究历史
${recentStudies.map(({ context }) => `- ${context.studyTopic}\n  类型: ${context.analystKind}\n  摘要: ${context.studyLog?.slice(0, 200)}`).join("\n\n")}

## 生成要求

1. **高度个性化**：基于用户的实际兴趣、行业、研究方向
2. **延续性**：可以是用户过往研究的延伸或深化
3. **实用性**：解决用户真实的业务问题
4. **数量**：生成 ${count} 个模板
5. **格式**：与公共模板格式一致（title, description, tags, category）

注意：
- 基于用户实际背景生成个性化模板
- 避免重复用户已做过的研究
- 确保每个模板都有实用价值
`
        : `You are atypica.AI's personalized research assistant. Generate ${count} highly personalized research scenario templates based on user's memory and research history.

## User Background

### User Memory (core interests and preferences)
${memoryCore || "None"}

### Recent Research History
${recentStudies.map(({ context }) => `- ${context.studyTopic}\n  Type: ${context.analystKind}\n  Summary: ${context.studyLog?.slice(0, 200)}`).join("\n\n")}

## Requirements

1. **Highly Personalized**: Based on user's actual interests, industry, research directions
2. **Continuity**: Can be extensions or deepening of past research
3. **Practical**: Solve real business problems for the user
4. **Quantity**: Generate ${count} templates
5. **Format**: Same as public templates (title, description, tags, category)

Note:
- Generate personalized templates based on user's actual background
- Avoid duplicating completed research
- Ensure each template has practical value
`;

    // 4. 调用 AI 生成（复用公共模板的 schema）
    const result = await generateObject({
      model: llm("claude-sonnet-4-5"),
      schema: generatedShortcutsSchema,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            locale === "zh-CN"
              ? "请基于我的背景生成个性化研究模板。"
              : "Generate personalized research templates based on my background.",
        },
      ],
    });

    // 5. 保存到数据库
    const templates = await prisma.$transaction(
      result.object.shortcuts.map((shortcut) =>
        prisma.researchTemplate.create({
          data: {
            title: shortcut.title,
            description: shortcut.description,
            locale,
            userId,
            extra: {
              tags: shortcut.tags,
            } satisfies ResearchTemplateExtra,
          },
        }),
      ),
    );

    logger.info({ msg: "Successfully generated personal templates", count: templates.length });

    // 清除缓存，让新模板立即在前端可见
    revalidateTag("research-templates");

    return templates.length;
  } catch (error) {
    logger.error({
      msg: "Failed to generate personal templates",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * 检查并为用户生成个人模板（如果需要）
 *
 * 触发条件：
 * - 用户没有个人模板
 * - 用户有至少 3 个研究或有 Memory
 *
 * @param userId - 用户 ID
 * @param locale - 语言
 * @returns 是否生成了模板
 */
export async function checkAndGeneratePersonalTemplates(
  userId: number,
  locale: Locale,
): Promise<boolean> {
  const logger = rootLogger.child({ fn: "checkAndGeneratePersonalTemplates", userId, locale });

  try {
    // 检查是否已有个人模板
    const existingCount = await prisma.researchTemplate.count({
      where: { userId, locale },
    });

    if (existingCount > 0) {
      logger.info({ msg: "User already has personal templates", count: existingCount });
      return false;
    }

    // 检查是否满足生成条件
    const [studyCount, memoryCount] = await Promise.all([
      prisma.userChat.count({ where: { userId, kind: "study" } }),
      prisma.memory.count({ where: { userId } }),
    ]);

    logger.info({
      msg: "Checked generation conditions",
      studyCount,
      hasMemory: memoryCount > 0,
    });

    // 至少有 3 个研究或有 Memory
    if (studyCount >= 3 || memoryCount > 0) {
      await generatePersonalTemplates(userId, locale);
      return true;
    }

    logger.info({ msg: "User does not meet conditions for personal template generation" });
    return false;
  } catch (error) {
    logger.error({
      msg: "Failed to check and generate personal templates",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}
