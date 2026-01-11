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
   - Brief 示例:"深入了解一线城市白领对精品咖啡的消费决策因素，通过一对一访谈..."

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

6. **创意标准（核心要求！）**

   ❌ **严格避免这些烂大街的话题**：
   - 咖啡/奶茶消费、健身/运动、短视频/直播、AI工具、电动车、在线教育、互联网医疗、游戏付费、美妆网红
   - 任何"用户留存"、"转化率优化"、"增长黑客"这类套话主题
   - 过于热门的赛道和老生常谈的痛点

   ✅ **创意原则**（每个模板必须满足至少1个）：

   1. **反直觉视角**：挑战常识，探索反向操作的价值
   2. **文化现象**：捕捉正在发生但未被充分商业化的社会趋势
   3. **小众深度**：垂直细分领域，虽然小众但有深度和价值
   4. **边缘新兴**：刚刚萌芽的趋势，主流还没关注到
   5. **跨界融合**：不同领域的方法论迁移和创新
   6. **价值观冲突**：社会议题中的矛盾和两难困境
   7. **被忽视的 B2B**：专业领域、企业服务、职业人群

   **创意自检**：
   - 如果这个主题在知乎/36氪/虎嗅上已经有100篇文章 → 不要
   - 如果用户看到会说"又是这个..." → 不要
   - 如果这是咨询公司PPT里的常规案例 → 不要
   - 如果让你眼前一亮、想说"这个角度有意思" → 就是它

7. **行业和角色的真实多样性**
   - 不要全是消费品和互联网公司
   - 覆盖：文化创意、专业服务、社会议题、垂直社区
   - 每个目标角色的场景要真实反映他们的工作困境，不是空洞套话

8. **多样性和平衡**
   - 卡片必须覆盖所有六个目标角色（产品经理、营销人员、创业者、创作者、咨询顾问、KOL/网红），每个角色至少1个
   - **输出类型平衡**：避免全是"生成报告"，应该包含：
     * 约25-33%的"播客生成"场景（快速洞察/热点分析/趋势解读）
     * 约50-58%的"生成报告"场景（深度研究/用户访谈/焦点小组）
     * 约8-17%的其他类型（人设构建/竞品分析等）
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

6. **Creativity Standards (Core Requirement!)**

   ❌ **Strictly Avoid These Overdone Topics**:
   - Coffee/tea consumption, fitness/gym, short videos/streaming, AI tools, electric vehicles, online education, telehealth, in-game purchases, beauty influencers
   - Any "user retention", "conversion optimization", "growth hacking" cliché themes
   - Overly popular sectors and tired pain points

   ✅ **Creativity Principles** (Each template must satisfy at least 1):

   1. **Counter-Intuitive**: Challenge conventions, explore value in reverse operations
   2. **Cultural Phenomena**: Capture emerging social trends not yet commercialized
   3. **Niche Depth**: Vertical niches that are small but deep and valuable
   4. **Emerging Edge**: Just-budding trends mainstream hasn't noticed yet
   5. **Cross-Disciplinary**: Methodology migration and innovation across fields
   6. **Value Conflicts**: Social dilemmas and contradictions
   7. **Overlooked B2B**: Professional fields, enterprise services, career groups

   **Creativity Self-Check**:
   - If this topic has 100+ articles on Medium/TechCrunch → Don't use it
   - If users would say "not this again..." → Don't use it
   - If this is a standard consulting firm case study → Don't use it
   - If it makes you think "this angle is interesting" → That's it

7. **True Industry and Role Diversity**
   - Not all consumer goods and internet companies
   - Cover: creative culture, professional services, social issues, vertical communities
   - Each target role's scenario should reflect real work challenges, not empty buzzwords

8. **Diversity and Balance**
   - Cards MUST cover all 6 target audiences (Product Managers, Marketers, Startup Owners, Creators, Consultants, Influencers) with at least 1 each
   - **Output type balance**: Avoid all "Report" outputs. Should include:
     * Approximately 25-33% "Podcast Generation" scenarios (quick insights/hot topic analysis/trend explanations)
     * Approximately 50-58% "Report" scenarios (deep research/user interviews/focus groups)
     * Approximately 8-17% other types (persona building/competitive analysis etc.)
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
  const otherCount = count - podcastCount - reportCount;

  const userPrompt =
    locale === "zh-CN"
      ? `请生成 ${count} 个高质量的研究场景快捷卡片。

目标受众（必须覆盖所有6个角色，每个至少1个）：
${allAudiencesContext}

要求：
1. **覆盖所有角色**：产品经理、营销人员、创业者、创作者、咨询顾问、KOL/网红，每个角色至少1个场景
2. **输出类型平衡**：
   - 约${podcastCount}个场景以"播客生成"结尾（适合快速洞察、热点解读、趋势分析）
   - 约${reportCount}个场景以"生成报告"结尾（适合深度研究、用户访谈、焦点小组）
   - 约${otherCount}个场景可以用其他输出类型
3. **严格遵守创意标准**：重新阅读 systemPrompt 中的"创意标准"部分，确保每个主题都满足创意原则
4. **避免禁止话题**：咖啡、健身、短视频、AI工具、电动车等烂大街的话题绝对不能出现
5. **标题自然直接**：**绝不使用**"产品经理专题："、"营销人员专题："这类格式
6. **描述丰富**：每个 description 必须 200-400 字，包含具体品牌、场景、探索维度
7. **触发词匹配**：确保 description 包含能触发 tags 中研究方法和 Agent 类型的关键词

发挥你的创意，每个主题都要让人眼前一亮！`
      : `Generate ${count} high-quality research scenario shortcut cards.

Target Audiences (MUST cover all 6 roles with at least 1 each):
${allAudiencesContext}

Requirements:
1. **Cover all roles**: Product Managers, Marketers, Startup Owners, Creators, Consultants, Influencers - at least 1 scenario for each
2. **Output type balance**:
   - Approximately ${podcastCount} scenarios ending with "Podcast Generation" (suitable for quick insights, hot topic analysis, trend explanations)
   - Approximately ${reportCount} scenarios ending with "Report" (suitable for deep research, user interviews, focus groups)
   - Approximately ${otherCount} scenarios can use other output types
3. **Strictly follow creativity standards**: Re-read the "Creativity Standards" section in systemPrompt and ensure each topic meets creativity principles
4. **Avoid forbidden topics**: Coffee, fitness, short videos, AI tools, electric vehicles - absolutely no overdone topics
5. **Natural and direct titles**: **NEVER use** formats like "For Product Managers:", "Marketers Special:"
6. **Rich descriptions**: Each description must be 100-200 words, including specific brands, scenarios, exploration dimensions
7. **Keyword matching**: Ensure description includes trigger keywords for research methods in tags and Agent types

Be creative and make each topic eye-catching!`;

  const result = await generateObject({
    model: llm("gpt-5-mini"),
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
    const recentStudies = await prisma.analyst.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        brief: true,
        topic: true,
        studyLog: true,
        kind: true,
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
${recentStudies.map((s) => `- ${s.topic}\n  类型: ${s.kind}\n  摘要: ${s.studyLog.slice(0, 200)}`).join("\n\n")}

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
${recentStudies.map((s) => `- ${s.topic}\n  Type: ${s.kind}\n  Summary: ${s.studyLog.slice(0, 200)}`).join("\n\n")}

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
      prisma.analyst.count({ where: { userId } }),
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
