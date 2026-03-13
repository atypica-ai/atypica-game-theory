"use server";

import { llm } from "@/ai/provider";
import type {
  SageAvatar,
  SageExtra,
  SageInterviewExtra,
  SageSourceContent,
  SageSourceExtra,
} from "@/app/(sage)/types";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import type { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import type { Sage, SageInterview, SageSource, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateObject } from "ai";
import JSZip from "jszip";
import type { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { WorkingMemoryItem } from "../types";
import { fetchSageActivities } from "./lib/activities";
import { fetchSageStats } from "./lib/stats";
import type { SageActivity, SageStats } from "./types";

/**
 * Create a supplementary interview to fill knowledge gaps
 * Interview will dynamically fetch gaps when the conversation starts
 */
export async function createSageInterviewAction(sageId: number): Promise<
  ServerActionResult<{
    interview: SageInterview;
    userChat: UserChat;
  }>
> {
  return withAuth(async (user) => {
    const sage = await prisma.sage.findUniqueOrThrow({
      where: {
        id: sageId,
        userId: user.id,
      },
      select: {
        name: true,
      },
    });

    // Create UserChat and Interview
    const { interview, userChat } = await prisma.$transaction(async (tx) => {
      const userChat = await createUserChat({
        userId: user.id,
        kind: "sageSession",
        title: `Interview: ${sage.name}`,
        tx,
      });
      const interview = await tx.sageInterview.create({
        data: {
          sageId,
          userChatId: userChat.id,
          extra: {
            startsAt: Date.now(),
            ongoing: true,
          } as SageInterviewExtra,
        },
      });
      return { interview, userChat };
    });

    rootLogger.info({
      msg: "Created supplementary interview",
      interviewId: interview.id,
      sageId,
    });

    return {
      success: true,
      data: { interview, userChat },
    };
  });
}

/**
 * Update sage avatar
 */
export async function updateSageAvatar(
  sageId: number,
  avatarUrl: string,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    // Check ownership and get token for revalidation
    const sage = await prisma.sage.findUnique({
      where: { id: sageId },
      select: {
        userId: true,
        token: true,
      },
    });

    if (!sage) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    if (sage.userId !== user.id) {
      return {
        success: false,
        message: "Not authorized",
        code: "forbidden",
      };
    }

    await prisma.sage.update({
      where: { id: sageId },
      data: {
        avatar: { url: avatarUrl },
      },
    });

    revalidatePath(`/sage/${sage.token}`);
    revalidatePath(`/sage/profile/${sage.token}`);

    return { success: true, data: undefined };
  });
}

/**
 * Get complete sage data by token for layout
 * Includes auth check and type conversion
 */
export async function getSageByTokenAction(sageToken: string): Promise<
  ServerActionResult<
    Omit<Sage, "extra" | "expertise" | "avatar"> & {
      extra: SageExtra;
      expertise: string[];
      avatar: SageAvatar;
    }
  >
> {
  return withAuth(async (user) => {
    const sage = await prisma.sage.findUnique({
      where: { token: sageToken, userId: user.id },
    });

    if (!sage) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    return {
      success: true,
      data: {
        ...sage,
        extra: sage.extra as SageExtra,
        expertise: sage.expertise as string[],
        avatar: sage.avatar as SageAvatar,
      },
    };
  });
}

export async function fetchSageSourcesByTokenAction(sageToken: string): Promise<
  ServerActionResult<
    Array<
      Pick<SageSource, "id" | "title"> & {
        extractedTextDigest: string;
        content: SageSourceContent;
        extra: SageSourceExtra;
      }
    >
  >
> {
  return withAuth(async (user) => {
    const sources = (
      await prisma.sageSource.findMany({
        where: {
          sage: {
            token: sageToken,
            userId: user.id, // ensure user owns the sage
          },
        },
        select: {
          id: true,
          title: true,
          content: true,
          extractedText: true,
          extra: true,
        },
        orderBy: { id: "desc" },
      })
    ).map(({ content, extra, extractedText, ...source }) => ({
      ...source,
      extractedTextDigest: extractedText.slice(0, 100),
      content: content as SageSourceContent,
      extra: extra as SageSourceExtra,
    }));

    return {
      success: true,
      data: sources,
    };
  });
}

/**
 * Fetch sage statistics
 */
export async function fetchSageStatsAction(
  sageToken: string,
): Promise<ServerActionResult<SageStats>> {
  return withAuth(async (user) => {
    const sage = await prisma.sage.findUnique({
      where: { token: sageToken, userId: user.id },
      select: { id: true },
    });

    if (!sage) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    const stats = await fetchSageStats(sage.id);

    return {
      success: true,
      data: stats,
    };
  });
}

/**
 * Fetch activity feed for sage
 */
export async function fetchSageActivitiesAction(
  sageToken: string,
): Promise<ServerActionResult<SageActivity[]>> {
  return withAuth(async (user) => {
    const sage = await prisma.sage.findUnique({
      where: { token: sageToken, userId: user.id },
      select: { id: true },
    });

    if (!sage) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    const locale = await getLocale();
    const activities = await fetchSageActivities({
      sageId: sage.id,
      sageToken,
      limit: 20,
      locale,
    });

    return {
      success: true,
      data: activities,
    };
  });
}

/**
 * Update sage profile information
 */
export async function updateSageProfileAction(
  sageId: number,
  data: {
    name?: string;
    domain?: string;
    bio?: string;
    expertise?: string[];
    locale?: "zh-CN" | "en-US";
  },
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const sage = await prisma.sage.findUnique({
      where: { id: sageId },
      select: { userId: true, token: true },
    });

    if (!sage) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    if (sage.userId !== user.id) {
      return {
        success: false,
        message: "Not authorized",
        code: "forbidden",
      };
    }

    await prisma.sage.update({
      where: { id: sageId },
      data,
    });

    revalidatePath(`/sage/${sage.token}`);
    revalidatePath(`/sage/profile/${sage.token}`);

    return { success: true, data: undefined };
  });
}

/**
 * Export sage as a Claude Skill file (.skill format - ZIP archive)
 * Returns the skill as base64-encoded ZIP file
 */
export async function exportSageAsSkillAction(sageToken: string): Promise<
  ServerActionResult<{
    filename: string;
    content: string; // base64-encoded ZIP
    contentType: string;
  }>
> {
  return withAuth(async (user) => {
    // Get sage with latest memory document
    const sage = await prisma.sage.findUnique({
      where: { token: sageToken, userId: user.id },
      include: {
        memoryDocuments: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!sage) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    const memoryDoc = sage.memoryDocuments[0];

    if (!memoryDoc || !memoryDoc.core) {
      return {
        success: false,
        message: "Sage memory is not ready yet. Please wait for processing to complete.",
        code: "internal_server_error",
      };
    }

    // Parse sage data
    const expertise = sage.expertise as string[];
    const extra = sage.extra as SageExtra;
    const locale = VALID_LOCALES.includes(sage.locale as Locale)
      ? (sage.locale as Locale)
      : "en-US";
    const workingMemory = (memoryDoc.working as WorkingMemoryItem[]) || [];

    // Generate skill name using AI
    const skillName = await generateSkillName({
      name: sage.name,
      domain: sage.domain,
      expertise,
      locale,
    });

    // Generate main SKILL.md (lightweight, overview only)
    const skillMarkdown = generateMainSkillMd({
      skillName,
      sage: {
        name: sage.name,
        domain: sage.domain,
        bio: sage.bio,
        expertise,
        locale,
        recommendedQuestions: extra.recommendedQuestions || [],
      },
    });

    // Create .skill ZIP file with references structure
    const zip = new JSZip();
    zip.file("SKILL.md", skillMarkdown);

    // Add core memory as reference
    const coreMemoryRef = generateCoreMemoryReference(memoryDoc.core, locale);
    zip.file("references/core-memory.md", coreMemoryRef);

    // Add working memory as reference (if exists)
    if (workingMemory.length > 0) {
      const workingMemoryRef = generateWorkingMemoryReference(workingMemory, locale);
      zip.file("references/working-memory.md", workingMemoryRef);
    }

    // Add knowledge gaps as reference (if available)
    const knowledgeGaps = await prisma.sageKnowledgeGap.findMany({
      where: { sageId: sage.id, resolvedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        description: true,
        severity: true,
        createdAt: true,
      },
    });
    if (knowledgeGaps.length > 0) {
      const gapsRef = generateKnowledgeGapsReference(knowledgeGaps, locale);
      zip.file("references/knowledge-gaps.md", gapsRef);
    }

    // Add recent chats summary as reference (optional)
    const recentChats = await prisma.sageChat.findMany({
      where: { sageId: sage.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        userChat: {
          select: { title: true, createdAt: true },
        },
      },
    });
    if (recentChats.length > 0) {
      const chatsRef = generateRecentChatsReference(recentChats, locale);
      zip.file("references/recent-chats.md", chatsRef);
    }

    // Generate ZIP as base64
    const zipBase64 = await zip.generateAsync({ type: "base64" });

    rootLogger.info({
      msg: "Exported sage as .skill file",
      sageId: sage.id,
      sageToken: sage.token,
      skillName,
      userId: user.id,
      hasWorkingMemory: workingMemory.length > 0,
    });

    return {
      success: true,
      data: {
        filename: `${skillName}.skill`,
        content: zipBase64,
        contentType: "application/zip",
      },
    };
  });
}

/**
 * Generate skill name using AI (only the name, not the content)
 */
async function generateSkillName({
  name,
  domain,
  expertise,
  locale,
}: {
  name: string;
  domain: string;
  expertise: string[];
  locale: Locale;
}): Promise<string> {
  const isZhCN = locale === "zh-CN";

  const skillNameResult = await generateObject({
    model: llm("gemini-3-flash"),
    schema: z.object({
      skillName: z
        .string()
        .describe(
          "A short, descriptive skill name in kebab-case (lowercase, hyphens only, 2-4 words)",
        ),
    }),
    prompt: isZhCN
      ? `为这位专家生成一个简短、描述性的 Claude Skill 名称：

专家信息：
- 名字：${name}
- 领域：${domain}
- 专长：${expertise.join("、")}

要求：
1. 只能包含小写字母、数字和连字符
2. 2-4 个英文单词，用连字符连接
3. 清晰描述专家的核心能力
4. 例如：startup-advisor, product-strategy-expert, ux-research-specialist

只返回 skill 名称，不需要解释。`
      : `Generate a short, descriptive Claude Skill name for this expert:

Expert Info:
- Name: ${name}
- Domain: ${domain}
- Expertise: ${expertise.join(", ")}

Requirements:
1. Lowercase letters, numbers, and hyphens only
2. 2-4 English words, connected with hyphens
3. Clearly describes the expert's core capability
4. Examples: startup-advisor, product-strategy-expert, ux-research-specialist

Return only the skill name, no explanation.`,
  });

  return skillNameResult.object.skillName;
}

/**
 * Generate lightweight SKILL.md with overview only
 */
function generateMainSkillMd({
  skillName,
  sage,
}: {
  skillName: string;
  sage: {
    name: string;
    domain: string;
    bio: string;
    expertise: string[];
    locale: Locale;
    recommendedQuestions: string[];
  };
}): string {
  const isZhCN = sage.locale === "zh-CN";

  return `---
name: ${skillName}
description: ${isZhCN ? `扮演 ${sage.name}，一位 ${sage.domain} 领域的专家，提供专业建议和见解。当用户需要 ${sage.expertise.slice(0, 3).join("、")} 等方面的专业指导时使用。` : `Act as ${sage.name}, an expert in ${sage.domain}, providing professional advice and insights. Use when users need guidance on ${sage.expertise.slice(0, 3).join(", ")}.`}
---

# ${sage.name} - ${sage.domain} ${isZhCN ? "专家" : "Expert"}

${isZhCN ? "## 你的角色" : "## Your Role"}

${
  isZhCN
    ? `你现在是 **${sage.name}**，一位 ${sage.domain} 领域的专家。

${sage.bio}

在对话中，你需要：
- 以 ${sage.name} 的身份和视角回答问题
- 运用你在 ${sage.domain} 领域的专业知识和经验
- 根据对话内容，主动从参考文件中调取相关知识
- 保持专业、真诚，提供有价值的见解和建议`
    : `You are now **${sage.name}**, an expert in ${sage.domain}.

${sage.bio}

In conversations, you should:
- Answer questions from ${sage.name}'s perspective and identity
- Apply your professional knowledge and experience in ${sage.domain}
- Proactively load relevant knowledge from reference files based on the conversation
- Maintain professionalism and sincerity, providing valuable insights and advice`
}

${isZhCN ? "## 专长领域" : "## Areas of Expertise"}

${sage.expertise.map((exp) => `- ${exp}`).join("\n")}

${isZhCN ? "## 如何使用参考文件" : "## How to Use Reference Files"}

${
  isZhCN
    ? `你的专业知识存储在以下参考文件中。在回答问题时，请**主动加载**相关的参考文件来获取准确信息：

### references/core-memory.md
**核心专业知识库** - 包含经过验证的专业知识、经验和见解。这是你的主要知识来源。

**使用场景：**
- 回答专业问题时，先查阅核心知识
- 需要引用具体案例、数据或理论时
- 确保答案的准确性和专业性

### references/working-memory.md（如有）
**最近补充知识** - 通过访谈补充的最新知识，已验证并整合。

**使用场景：**
- 处理最新话题或趋势
- 核心知识库中没有覆盖的领域
- 需要更新的观点或实践

### references/knowledge-gaps.md（如有）
**待完善领域** - 已识别但尚未深入研究的知识空白。

**使用场景：**
- 遇到不确定的问题时，查看是否属于已知空白
- 坦诚告知用户这是你正在学习的领域
- 根据优先级（高/中/低）判断重要性

### references/recent-chats.md（如有）
**最近对话摘要** - 展示最近关注的话题和讨论。

**使用场景：**
- 了解用户可能感兴趣的话题方向
- 保持对话的连贯性和上下文
- 参考之前讨论过的类似问题

## 对话指南

1. **主动加载知识**：根据用户问题，判断需要查阅哪个参考文件
2. **保持角色**：始终以 ${sage.name} 的身份回答，使用第一人称
3. **承认局限**：如果某个问题属于知识空白，坦诚说明
4. **深度交流**：鼓励多轮对话，深入探讨具体话题
5. **提供价值**：不只是回答问题，还要主动提供见解和建议`
    : `Your professional knowledge is stored in the following reference files. When answering questions, **proactively load** relevant reference files to obtain accurate information:

### references/core-memory.md
**Core Knowledge Base** - Contains verified professional knowledge, experience, and insights. This is your primary knowledge source.

**Use when:**
- Answering professional questions - consult core knowledge first
- Need to cite specific cases, data, or theories
- Ensuring accuracy and professionalism in answers

### references/working-memory.md (if available)
**Recently Supplemented Knowledge** - Latest knowledge supplemented through interviews, verified and integrated.

**Use when:**
- Addressing latest topics or trends
- Covering areas not in the core knowledge base
- Need updated perspectives or practices

### references/knowledge-gaps.md (if available)
**Areas to be Improved** - Identified knowledge gaps not yet deeply researched.

**Use when:**
- Encountering uncertain questions - check if it's a known gap
- Honestly inform users this is an area you're learning
- Judge importance based on priority (Critical/Important/Nice to Have)

### references/recent-chats.md (if available)
**Recent Conversation Summaries** - Shows recently focused topics and discussions.

**Use when:**
- Understanding topics users might be interested in
- Maintaining conversation coherence and context
- Referencing similar previously discussed questions

## Conversation Guidelines

1. **Proactively Load Knowledge**: Based on user questions, determine which reference file to consult
2. **Stay in Character**: Always answer as ${sage.name}, use first person
3. **Acknowledge Limitations**: If a question falls in a knowledge gap, be honest about it
4. **Deep Exchange**: Encourage multi-turn conversations to explore specific topics in depth
5. **Provide Value**: Don't just answer questions - proactively offer insights and advice`
}

${
  sage.recommendedQuestions.length > 0
    ? `
${isZhCN ? "## 推荐问题" : "## Recommended Questions"}

${isZhCN ? "用户可以从以下问题开始对话：" : "Users can start conversations with these questions:"}

${sage.recommendedQuestions.map((q) => `- ${q}`).join("\n")}
`
    : ""
}
`;
}

/**
 * Generate core memory reference document
 */
function generateCoreMemoryReference(coreMemory: string, locale: Locale): string {
  const isZhCN = locale === "zh-CN";

  return `# ${isZhCN ? "核心专业知识" : "Core Professional Knowledge"}

${isZhCN ? "这是专家的核心知识库，包含经过验证的专业知识、经验和见解。" : "This is the expert's core knowledge base, containing verified professional knowledge, experience, and insights."}

---

${coreMemory}
`;
}

/**
 * Generate knowledge gaps reference document
 */
function generateKnowledgeGapsReference(
  knowledgeGaps: Array<{
    id: number;
    description: string;
    severity: string;
    createdAt: Date;
  }>,
  locale: Locale,
): string {
  const isZhCN = locale === "zh-CN";

  const gapsBySeverity = {
    CRITICAL: knowledgeGaps.filter((g) => g.severity === "CRITICAL"),
    IMPORTANT: knowledgeGaps.filter((g) => g.severity === "IMPORTANT"),
    NICE_TO_HAVE: knowledgeGaps.filter((g) => g.severity === "NICE_TO_HAVE"),
  };

  return `# ${isZhCN ? "待完善的知识领域" : "Knowledge Areas to be Improved"}

${isZhCN ? "这些是通过与用户对话发现的知识空白，专家正在逐步完善这些领域。" : "These are knowledge gaps discovered through conversations with users, which the expert is gradually improving."}

${
  gapsBySeverity.CRITICAL.length > 0
    ? `
## ${isZhCN ? "高优先级" : "Critical Priority"}

${gapsBySeverity.CRITICAL.map((gap) => `- ${gap.description}`).join("\n")}
`
    : ""
}

${
  gapsBySeverity.IMPORTANT.length > 0
    ? `
## ${isZhCN ? "中优先级" : "Important Priority"}

${gapsBySeverity.IMPORTANT.map((gap) => `- ${gap.description}`).join("\n")}
`
    : ""
}

${
  gapsBySeverity.NICE_TO_HAVE.length > 0
    ? `
## ${isZhCN ? "低优先级" : "Nice to Have"}

${gapsBySeverity.NICE_TO_HAVE.map((gap) => `- ${gap.description}`).join("\n")}
`
    : ""
}
`;
}

/**
 * Generate recent chats summary reference document
 */
function generateRecentChatsReference(
  recentChats: Array<{
    id: number;
    userChat: {
      title: string;
      createdAt: Date;
    };
  }>,
  locale: Locale,
): string {
  const isZhCN = locale === "zh-CN";

  return `# ${isZhCN ? "最近对话摘要" : "Recent Conversation Summaries"}

${isZhCN ? "这是与用户的最近对话记录，展示了专家最近关注的话题和讨论。" : "These are recent conversation records with users, showing topics and discussions the expert has been focusing on recently."}

${recentChats
  .map(
    (chat) => `
## ${chat.userChat.title}

${isZhCN ? "时间" : "Time"}: ${chat.userChat.createdAt.toLocaleDateString(locale)}
`,
  )
  .join("\n")}
`;
}

/**
 * Generate working memory reference document for references/ directory
 * This allows Claude to load recent knowledge on-demand
 */
function generateWorkingMemoryReference(
  workingMemory: WorkingMemoryItem[],
  locale: Locale,
): string {
  const isZhCN = locale === "zh-CN";

  return `# ${isZhCN ? "最近补充知识" : "Recent Supplemental Knowledge"}

${isZhCN ? "这些知识是最近通过访谈补充的，已验证并整合到专家知识体系中。" : "This knowledge was recently supplemented through interviews, verified and integrated into the expert knowledge system."}

---

${workingMemory
  .map(
    (item, i) => `
## ${isZhCN ? "知识条目" : "Knowledge Item"} ${i + 1}

${item.content}

${isZhCN ? "*更新时间*" : "*Updated*"}: ${isZhCN ? "最近访谈" : "Recent interview"}
`,
  )
  .join("\n---\n")}
`;
}
