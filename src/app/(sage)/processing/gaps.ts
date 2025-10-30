import "server-only";

import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { createSageKnowledgeGaps } from "@/app/(sage)/lib";
import { SageExtra, SageKnowledgeGapSeverity } from "@/app/(sage)/types";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { generateObject } from "ai";
import type { Locale } from "next-intl";
import { Logger } from "pino";
import z from "zod";
import { sageKnowledgeGapsOnlySystem } from "../prompt";

/**
 * Analyze sage knowledge completeness
 */
export async function analyzeKnowledgeOnly({
  sageId,
  locale,
}: {
  sageId: number;
  locale: Locale;
}): Promise<void> {
  const logger = rootLogger.child({ sageId });

  const statReport: StatReporter = (async (dimension, value, extra) => {
    rootLogger.info({
      msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
      extra,
      note: "analyzeKnowledgeOnly is currently free - tokens not deducted",
    });
  }) as StatReporter;

  try {
    const { sage, memoryDocument } = await prisma.sage
      .findUniqueOrThrow({
        where: { id: sageId },
        include: {
          memoryDocuments: {
            orderBy: { version: "desc" },
            take: 1,
            select: { content: true },
          },
        },
      })
      .then(({ memoryDocuments, expertise, extra, ...sage }) => ({
        sage: {
          ...sage,
          expertise: expertise as string[],
          extra: extra as SageExtra,
        },
        memoryDocument: memoryDocuments.length > 0 ? memoryDocuments[0] : undefined,
      }));

    if (!memoryDocument) {
      throw new Error("Memory document not available");
    }

    const knowledgeGaps = await analyzeKnowledgeGaps({
      sage: {
        name: sage.name,
        domain: sage.domain,
        expertise: sage.expertise,
      },
      memoryDocument,
      locale,
      statReport,
      logger,
    });

    // 只创建一次，之后只通过 chat 补充
    // TODO 这个逻辑需要优化，可以改成每次都删除没有 resolved 然后重新生成
    const existingGaps = await prisma.sageKnowledgeGap.count({
      where: { sageId },
    });
    if (existingGaps === 0 && knowledgeGaps.length > 0) {
      await createSageKnowledgeGaps(
        knowledgeGaps.map((gap) => ({
          sageId,
          area: gap.area,
          description: gap.description,
          severity: gap.severity,
          impact: gap.impact,
          source: {
            type: "analysis",
            description: "Initial knowledge analysis",
          },
        })),
      );
    }

    logger.info({ msg: "Knowledge gaps analysis completed successfully" });
  } catch (error) {
    logger.error({
      msg: "Knowledge gaps analysis failed",
      error: (error as Error).message,
    });
    throw error;
  }
}

const knowledgeGapsSchema = z.object({
  knowledgeGaps: z.array(
    z.object({
      area: z.string().describe("Knowledge area with gaps"),
      severity: z.enum(Object.values(SageKnowledgeGapSeverity)).describe("Severity of the gap"),
      description: z.string().describe("What's missing"),
      impact: z.string().describe("Impact on expert's capability"),
      suggestedQuestions: z.array(z.string()).describe("Questions to fill this gap"),
    }),
  ),
});

/**
 * Analyze knowledge gaps from Memory Document
 */
export async function analyzeKnowledgeGaps({
  sage,
  memoryDocument,
  locale,
  statReport,
  logger,
}: {
  sage: { name: string; domain: string; expertise: string[] };
  memoryDocument: { content: string };
  locale: Locale;
  statReport: StatReporter;
  logger: Logger;
}): Promise<
  Array<{
    area: string;
    severity: SageKnowledgeGapSeverity;
    description: string;
    impact: string;
    suggestedQuestions: string[];
  }>
> {
  logger.info({ msg: "Analyzing knowledge gaps" });

  const result = await generateObject({
    model: llm("claude-haiku-4-5"),
    schema: knowledgeGapsSchema,
    system: sageKnowledgeGapsOnlySystem({ sage, locale }),
    prompt: memoryDocument.content,
    maxRetries: 3,
  });

  logger.info({
    msg: "Knowledge gaps analysis completed",
    knowledgeGapsCount: result.object.knowledgeGaps.length,
  });

  if (result.usage.totalTokens) {
    await statReport("tokens", result.usage.totalTokens, {
      reportedBy: "analyze knowledge gaps",
    });
  }

  return result.object.knowledgeGaps;
}

const conversationGapSchema = z.object({
  hasGap: z.boolean().describe("Whether a knowledge gap was detected"),
  gaps: z
    .array(
      z.object({
        area: z.string().describe("Knowledge area with gap"),
        severity: z.enum(Object.values(SageKnowledgeGapSeverity)).describe("Severity of the gap"),
        description: z.string().describe("What's missing or inadequate"),
        impact: z.string().describe("Impact on expert's capability"),
        suggestedQuestions: z.array(z.string()).describe("Questions to fill this gap").max(3),
      }),
    )
    .describe("List of detected knowledge gaps")
    .optional(),
});

/**
 * Analyze conversation to detect knowledge gaps
 * Called after sage responds to user question
 */
export async function analyzeConversationForGaps({
  userMessage,
  aiResponse,
  sage,
  locale,
  statReport,
  logger,
}: {
  userMessage: string;
  aiResponse: string;
  sage: { name: string; domain: string };
  locale: Locale;
  statReport: StatReporter;
  logger: Logger;
}): Promise<
  Array<{
    area: string;
    severity: SageKnowledgeGapSeverity;
    description: string;
    impact: string;
  }>
> {
  logger.info({ msg: "Analyzing knowledge gaps from conversation" });

  const result = await generateObject({
    model: llm("gemini-2.5-flash"), // Fast model for quick analysis
    schema: conversationGapSchema,
    system:
      locale === "zh-CN"
        ? `你是一个专业的知识完整度分析师。分析专家与用户的对话，识别专家回答中的知识空白。

<Expert>
Name: ${sage.name}
Domain: ${sage.domain}
</Expert>

<Detection Criteria>
知识空白的标志：
1. 专家明确表示不知道或不确定
2. 回答模糊、空泛，缺乏具体信息
3. 回避问题，转移话题
4. 回答明显不专业或错误
5. 缺少实例、数据、经验支撑

<Ignore>
- 正常的合理边界（如"这不在我的专业范围"）
- 需要更多上下文的追问（这是正常对话）
- 专家给出了合理、专业的回答
</Ignore>

<Output>
如果检测到知识空白，设置 hasGap=true 并列出gaps。
如果回答质量正常，设置 hasGap=false。
</Output>`
        : `You are a professional knowledge completeness analyst. Analyze the conversation between the expert and user to identify knowledge gaps in the expert's response.

<Expert>
Name: ${sage.name}
Domain: ${sage.domain}
</Expert>

<Detection Criteria>
Signs of knowledge gaps:
1. Expert explicitly states they don't know or are uncertain
2. Vague, generic answers lacking specific information
3. Avoiding the question, changing the subject
4. Obviously unprofessional or incorrect answers
5. Lack of examples, data, or experience to support claims

<Ignore>
- Normal reasonable boundaries (like "this is outside my expertise")
- Asking for more context (normal conversation flow)
- Expert provides reasonable, professional answers
</Ignore>

<Output>
If knowledge gap detected, set hasGap=true and list gaps.
If answer quality is normal, set hasGap=false.
</Output>`,
    prompt:
      locale === "zh-CN"
        ? `<User Question>
${userMessage}
</User Question>

<Expert Response>
${aiResponse}
</Expert Response>

请分析上述对话，判断专家回答中是否存在知识空白。`
        : `<User Question>
${userMessage}
</User Question>

<Expert Response>
${aiResponse}
</Expert Response>

Analyze the above conversation and determine if there are knowledge gaps in the expert's response.`,
    maxRetries: 2,
  });

  logger.info({
    msg: "Knowledge gaps analysis from conversation completed",
    knowledgeGapsCount: result.object.gaps?.length ?? 0,
  });

  if (result.usage.totalTokens) {
    await statReport("tokens", result.usage.totalTokens, {
      reportedBy: "analyze knowledge gaps from conversation",
    });
  }

  if (result.object.hasGap && result.object.gaps) {
    return result.object.gaps;
  }

  return [];
}
