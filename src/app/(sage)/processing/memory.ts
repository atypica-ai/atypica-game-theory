import "server-only";

import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import {
  addEpisodicMemory,
  addWorkingMemory,
  createOrUpdateMemoryDocument,
} from "@/app/(sage)/lib";
import {
  buildSageCoreMemorySystemPrompt,
  buildSageProfileSystemPrompt,
} from "@/app/(sage)/prompt/memory";
import type { SageKnowledgeGapSeverity, SageSourceContent } from "@/app/(sage)/types";
import {
  SageExtra,
  SageInterviewExtra,
  SageKnowledgeGapExtra,
  SageKnowledgeGapResolvedBy,
  WorkingMemoryItem,
} from "@/app/(sage)/types";
import { rootLogger } from "@/lib/logging";
import { Sage, SageSource } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { generateObject, streamText, UserModelMessage } from "ai";
import type { Locale } from "next-intl";
import { Logger } from "pino";
import z from "zod";

/**
 * Extract knowledge and build memory document from completed sources
 * Step 1: buildSageProfile
 * Step 2: buildSageCoreMemory
 * Will create a new version of the memory document
 */
export async function extractKnowledgeFromSources({
  sageId,
  locale,
  logger,
  statReport,
}: {
  sageId: number;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
}): Promise<void> {
  const [sage, completedSources] = await Promise.all([
    prisma.sage.findUniqueOrThrow({
      where: { id: sageId },
      select: { id: true, name: true, domain: true },
    }),
    prisma.sageSource
      .findMany({
        where: { sageId, extractedText: { not: "" } },
        orderBy: { id: "asc" },
      })
      .then((sources) =>
        sources.map(({ content, ...source }) => ({
          ...source,
          content: content as SageSourceContent,
        })),
      ),
  ]);

  if (completedSources.length === 0) {
    throw new Error("No sources were successfully processed");
  }
  logger.info({
    msg: "Extracting knowledge from sage sources",
    sourcesCount: completedSources.length,
  });
  const sageSources = completedSources;

  // Step 1 & 2: Generate profile and build memory document in parallel
  const [, coreMemory] = await Promise.all([
    extractKnowledge_1_buildSageProfile({ sage, sageSources, locale, statReport, logger }).then(
      async ({ categories: expertise, bio, recommendedQuestions }) => {
        // Update sage immediately after profile generation
        await prisma.sage.update({
          where: { id: sageId },
          data: { expertise, bio },
        });
        // Update SageExtra with recommended questions
        await mergeExtra({
          tableName: "Sage",
          id: sageId,
          extra: { recommendedQuestions } satisfies SageExtra,
        });
      },
    ),
    extractKnowledge_2_buildSageCoreMemory({ sage, sageSources, locale, statReport, logger }),
  ]);

  // Save Memory Document as first version
  await createOrUpdateMemoryDocument({
    sageId,
    operation: "extract_from_sources",
    coreMemory: coreMemory,
    changeNotes: "Extract knowledge from sources",
  });

  logger.info({ msg: "Knowledge extraction completed successfully" });
}

/**
 * Generate sage profile including categories, bio, and recommended questions
 */
async function extractKnowledge_1_buildSageProfile({
  sage,
  sageSources,
  locale,
  statReport,
  logger,
}: {
  sage: Pick<Sage, "id" | "name" | "domain">;
  sageSources: (Pick<SageSource, "id" | "extractedText"> & { content: SageSourceContent })[];
  locale: Locale;
  statReport: StatReporter;
  logger: Logger;
}): Promise<{
  categories: string[];
  bio: string;
  recommendedQuestions: string[];
}> {
  const allExtractedTexts = sageSources
    .map((s) => s.extractedText)
    .filter((text): text is string => !!text);
  const rawContent = allExtractedTexts.join("\n\n---\n\n");

  const sageProfileSchema = z.object({
    categories: z
      .array(z.string())
      .describe("Suggested topic categories for organizing the knowledge (3-10 categories)"),
    bio: z.string().describe("2-3 sentence professional bio for the expert"),
    recommendedQuestions: z
      .array(z.string())
      .length(4)
      .describe("Exactly 4 recommended questions for users to ask the expert"),
  });

  const result = await generateObject({
    model: llm("gemini-2.5-flash"),
    schema: sageProfileSchema,
    system: buildSageProfileSystemPrompt({ sage, locale }),
    prompt: rawContent,
    maxRetries: 3,
  });

  if (result.usage.totalTokens) {
    const totalTokens = result.usage.totalTokens;
    await statReport("tokens", totalTokens, {
      reportedBy: "build sage profile",
    });
  }

  logger.info({
    msg: "buildSageProfile completed",
    categoriesCount: result.object.categories.length,
    recommendedQuestionsCount: result.object.recommendedQuestions.length,
  });

  return result.object;
}

/**
 * Build Sage CoreMemory from sources
 * Source text is already compressed, build with Claude
 */
export async function extractKnowledge_2_buildSageCoreMemory({
  sage,
  sageSources,
  locale,
  statReport,
  logger,
}: {
  sage: Pick<Sage, "id" | "name" | "domain">;
  sageSources: (Pick<SageSource, "id" | "extractedText"> & { content: SageSourceContent })[];
  locale: Locale;
  statReport: StatReporter;
  logger: Logger;
}): Promise<string> {
  const allExtractedTexts = sageSources
    .map((s) => s.extractedText)
    .filter((text): text is string => !!text);
  const rawContent = allExtractedTexts.join("\n\n---\n\n");

  const messages: UserModelMessage[] = [
    {
      role: "user",
      content:
        locale === "zh-CN"
          ? "请根据以下内容，生成完整的、结构化的记忆文档。"
          : "Build a a complete, structured memory document based on the following content",
    },
    {
      role: "user",
      content: rawContent,
    },
  ];

  const promise = new Promise<string>(async (resolve, reject) => {
    let coreMemory = "";
    const buildingResponse = streamText({
      model: llm("claude-haiku-4-5"),
      system: buildSageCoreMemorySystemPrompt({ sage, locale }),
      messages,
      maxRetries: 3,
      onChunk: ({ chunk }) => {
        if (chunk.type === "text-delta") {
          coreMemory += chunk.text;
          logger.debug({
            msg: "buildSageCoreMemory",
            stage: "building",
            length: coreMemory.length,
          });
        }
      },
      onError: ({ error }) => {
        logger.error({
          msg: "buildSageCoreMemory onError",
          stage: "building",
          error: (error as Error).message,
        });
        reject(error);
      },
      onFinish: async ({ usage }) => {
        if (usage.totalTokens) {
          await statReport("tokens", usage.totalTokens, {
            reportedBy: "build core memory",
          });
        }
        logger.info({
          msg: "buildSageCoreMemory onFinish",
          stage: "building",
          length: coreMemory.length,
        });
        resolve(coreMemory);
      },
    });

    await buildingResponse
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });

  const coreMemory = await promise;
  return coreMemory;
}

/**
 * Analyze which knowledge gaps are resolved by interview content using AI
 */
async function analyzeGapResolution({
  interviewTranscript,
  pendingGaps,
  locale,
  statReport,
  logger,
}: {
  interviewTranscript: string;
  pendingGaps: Array<{
    id: number;
    area: string;
    description: string;
    severity: SageKnowledgeGapSeverity;
    impact: string;
  }>;
  locale: Locale;
  statReport: StatReporter;
  logger: Logger;
}): Promise<
  Array<{
    gapId: number;
    resolved: boolean;
    confidence: number;
    evidence: string[];
    missingAspects?: string[];
  }>
> {
  if (pendingGaps.length === 0) {
    return [];
  }

  const gapResolutionSchema = z.object({
    analysis: z
      .array(
        z.object({
          gapId: z.number().describe("The ID of the knowledge gap"),
          resolved: z.boolean().describe("Whether this gap is resolved by the interview content"),
          confidence: z
            .number()
            .min(0)
            .max(1)
            .describe("Confidence level (0-1) that the gap is resolved"),
          evidence: z
            .array(z.string())
            .describe("Specific quotes or references from interview that resolve this gap"),
          missingAspects: z
            .array(z.string())
            .optional()
            .describe("If not fully resolved, what aspects are still missing"),
        }),
      )
      .describe("Analysis results for each knowledge gap"),
  });

  const systemPrompt =
    locale === "zh-CN"
      ? `你是一个知识缺口分析专家。你的任务是分析访谈内容是否解决了专家知识库中的知识缺口。

对于每个知识缺口，请判断：
1. 访谈内容是否讨论了该缺口涉及的主题
2. 讨论是否提供了有价值的信息来填补该缺口
3. 提供具体的证据（引用访谈中的关键句子）
4. 如果只是部分解决，说明还缺少哪些方面

判断标准：
- resolved=true: 访谈内容充分讨论了该主题，提供了实质性的信息
- confidence > 0.8: 访谈内容直接且详细地解决了该缺口
- confidence 0.5-0.8: 访谈内容提供了相关信息，但可能不够详细
- confidence < 0.5: 访谈内容仅略微涉及该主题

请客观分析，不要过度解读。`
      : `You are a knowledge gap analysis expert. Your task is to analyze whether interview content resolves knowledge gaps in the expert's knowledge base.

For each knowledge gap, determine:
1. Whether the interview discusses the topic of this gap
2. Whether the discussion provides valuable information to fill this gap
3. Provide specific evidence (quote key sentences from the interview)
4. If only partially resolved, explain what aspects are still missing

Judgment criteria:
- resolved=true: Interview sufficiently discusses the topic with substantial information
- confidence > 0.8: Interview directly and thoroughly addresses the gap
- confidence 0.5-0.8: Interview provides relevant information but may lack detail
- confidence < 0.5: Interview only briefly touches on the topic

Please analyze objectively without over-interpreting.`;

  const userPrompt =
    locale === "zh-CN"
      ? `# 访谈内容

${interviewTranscript}

# 待分析的知识缺口

${pendingGaps
  .map(
    (gap) => `## 缺口 #${gap.id}: ${gap.area}
描述: ${gap.description}
严重性: ${gap.severity}
影响: ${gap.impact}`,
  )
  .join("\n\n")}

请分析以上访谈内容是否解决了这些知识缺口。`
      : `# Interview Content

${interviewTranscript}

# Knowledge Gaps to Analyze

${pendingGaps
  .map(
    (gap) => `## Gap #${gap.id}: ${gap.area}
Description: ${gap.description}
Severity: ${gap.severity}
Impact: ${gap.impact}`,
  )
  .join("\n\n")}

Please analyze whether the interview content resolves these knowledge gaps.`;

  try {
    const result = await generateObject({
      model: llm("claude-sonnet-4-5"),
      schema: gapResolutionSchema,
      system: systemPrompt,
      prompt: userPrompt,
      maxRetries: 3,
    });

    if (result.usage.totalTokens) {
      await statReport("tokens", result.usage.totalTokens, {
        reportedBy: "analyze gap resolution",
      });
    }

    logger.info({
      msg: "Analyzed gap resolution",
      totalGaps: pendingGaps.length,
      resolvedCount: result.object.analysis.filter((a) => a.resolved).length,
    });

    return result.object.analysis;
  } catch (error) {
    logger.error({
      msg: "Failed to analyze gap resolution with AI, falling back to empty result",
      error: (error as Error).message,
    });
    return [];
  }
}

/**
 * End Sage Interview
 * Triggered when user clicks "End Interview" button
 *
 * Performs:
 * 1. AI analysis of which gaps were resolved
 * 2. Add Working Memory (if gaps resolved)
 * 3. Add Episodic Memory
 * 4. Mark gaps as resolved
 * 5. Update interview status to completed
 */
export async function endSageInterview({
  sageId,
  interviewId,
  locale,
}: {
  sageId: number;
  interviewId: number;
  locale: Locale;
}): Promise<{
  resolvedGapsCount: number;
  workingMemoryAdded: boolean;
  episodicMemoryAdded: boolean;
}> {
  const logger = rootLogger.child({ sageId, interviewId });

  const statReport: StatReporter = (async (dimension, value, extra) => {
    rootLogger.info({
      msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
      extra,
      note: "endSageInterview is currently free - tokens not deducted",
    });
  }) as StatReporter;

  try {
    // Verify sage exists
    await prisma.sage.findUniqueOrThrow({
      where: { id: sageId },
    });

    const interview = await prisma.sageInterview.findUnique({
      where: { id: interviewId },
      include: {
        userChat: {
          include: {
            messages: {
              orderBy: { id: "asc" },
            },
          },
        },
      },
    });

    if (!interview) {
      throw new Error(`Interview ${interviewId} not found`);
    }

    logger.info({
      msg: "Ending sage interview - analyzing gaps and adding memories",
    });

    // Format interview transcript
    const interviewTranscript = interview.userChat.messages
      .map(convertDBMessageToAIMessage)
      .map(
        (msg) =>
          `${msg.role === "user" ? "Interviewee" : "Interviewer"}: ${msg.parts.map((part) => (part.type === "text" ? part.text : "")).join(" ")}`,
      )
      .join("\n");

    // Get pending gaps to analyze
    const pendingGaps = (
      await prisma.sageKnowledgeGap.findMany({
        where: {
          sageId,
          resolvedAt: null,
        },
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      })
    ).map(({ severity, extra, ...gap }) => ({
      ...gap,
      severity: severity as SageKnowledgeGapSeverity,
      extra: extra as SageKnowledgeGapExtra,
    }));

    // Use AI to analyze which gaps are resolved
    const gapAnalysis = await analyzeGapResolution({
      interviewTranscript,
      pendingGaps,
      locale,
      statReport,
      logger,
    });

    // Filter gaps that are resolved with sufficient confidence
    const resolvedGaps = gapAnalysis.filter((a) => a.resolved && a.confidence >= 0.5);
    const resolvedGapIds = resolvedGaps.map((g) => g.gapId);

    let workingMemoryAdded = false;

    // Only add Working Memory if gaps were resolved
    if (resolvedGaps.length > 0) {
      const workingItem: WorkingMemoryItem = {
        id: `interview-${interviewId}-${Date.now()}`,
        content: `# Knowledge from Interview\n\n${interviewTranscript}`,
        source: "interview",
        sourceId: interview.userChat.token,
        relatedGapIds: resolvedGapIds,
        status: "pending",
      };

      await addWorkingMemory({
        sageId,
        workingItem,
      });

      workingMemoryAdded = true;

      // Update each gap's extra field with resolution details
      for (const analysis of resolvedGaps) {
        await prisma.sageKnowledgeGap.update({
          where: { id: analysis.gapId },
          data: {
            extra: {
              resolutionConfidence: analysis.confidence,
              resolutionEvidence: analysis.evidence,
              missingAspects: analysis.missingAspects,
            },
          },
        });
      }

      // Mark gaps as resolved
      await prisma.sageKnowledgeGap.updateMany({
        where: { id: { in: resolvedGapIds } },
        data: {
          resolvedAt: new Date(),
          resolvedBy: {
            type: "interview",
            userChatToken: interview.userChat.token,
          } satisfies SageKnowledgeGapResolvedBy,
        },
      });

      logger.info({
        msg: "Marked knowledge gaps as resolved",
        resolvedCount: resolvedGapIds.length,
      });

      logger.info({
        msg: "Resolved gaps and added working memory",
        resolvedCount: resolvedGapIds.length,
        averageConfidence:
          resolvedGaps.reduce((sum, g) => sum + g.confidence, 0) / resolvedGaps.length,
      });
    } else {
      logger.info({
        msg: "No gaps resolved, working memory not added",
      });
    }

    // Always add Episodic Memory
    await addEpisodicMemory({
      sageId,
      chatId: interview.userChat.token,
    });

    // Update interview status to completed
    await mergeExtra({
      tableName: "SageInterview",
      id: interviewId,
      extra: {
        completedAt: Date.now(),
      } satisfies SageInterviewExtra,
    });

    logger.info({
      msg: "Interview ended successfully",
      resolvedGapsCount: resolvedGapIds.length,
      workingMemoryAdded,
    });

    return {
      resolvedGapsCount: resolvedGapIds.length,
      workingMemoryAdded,
      episodicMemoryAdded: true,
    };
  } catch (error) {
    logger.error({
      msg: "Failed to end interview",
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * End Sage Chat
 * Triggered when user clicks "End Chat" button for regular conversations
 *
 * Performs:
 * 1. AI analysis to discover new knowledge gaps
 * 2. Create new gaps
 * 3. Add Episodic Memory
 */
export async function endSageChat({
  sageId,
  chatId,
  locale,
}: {
  sageId: number;
  chatId: number;
  locale: Locale;
}): Promise<{
  newGapsCount: number;
  episodicMemoryAdded: boolean;
}> {
  const logger = rootLogger.child({ sageId, chatId });

  const statReport: StatReporter = (async (dimension, value, extra) => {
    rootLogger.info({
      msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
      extra,
      note: "endSageChat is currently free - tokens not deducted",
    });
  }) as StatReporter;

  try {
    const sage = await prisma.sage.findUniqueOrThrow({
      where: { id: sageId },
    });

    const chat = await prisma.sageChat.findUnique({
      where: { id: chatId },
      include: {
        userChat: {
          include: {
            messages: {
              orderBy: { id: "asc" },
            },
          },
        },
      },
    });

    if (!chat) {
      throw new Error(`Chat ${chatId} not found`);
    }

    logger.info({
      msg: "Ending sage chat - discovering new gaps and adding episodic memory",
    });

    // Format chat transcript
    const chatTranscript = chat.userChat.messages
      .map(convertDBMessageToAIMessage)
      .map(
        (msg) =>
          `${msg.role === "user" ? "User" : "Sage"}: ${msg.parts.map((part) => (part.type === "text" ? part.text : "")).join(" ")}`,
      )
      .join("\n");

    // Use AI to discover new gaps from conversation
    const newGaps = await discoverNewGaps({
      chatTranscript,
      sageDomain: sage.domain,
      locale,
      statReport,
      logger,
    });

    // Create new gaps
    if (newGaps.length > 0) {
      await prisma.sageKnowledgeGap.createMany({
        data: newGaps.map((gap) => ({
          sageId,
          area: gap.area,
          description: gap.description,
          severity: gap.severity,
          impact: gap.reasoning,
          source: {
            type: "conversation",
            userChatToken: chat.userChat.token,
            quote: gap.userQuestion || "",
          },
        })),
      });

      logger.info({
        msg: "Created new knowledge gaps from chat",
        newGapsCount: newGaps.length,
      });
    }

    // Always add Episodic Memory
    await addEpisodicMemory({
      sageId,
      chatId: chat.userChat.token,
    });

    logger.info({
      msg: "Chat ended successfully",
      newGapsCount: newGaps.length,
    });

    return {
      newGapsCount: newGaps.length,
      episodicMemoryAdded: true,
    };
  } catch (error) {
    logger.error({
      msg: "Failed to end chat",
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Discover new knowledge gaps from conversation using AI
 */
async function discoverNewGaps({
  chatTranscript,
  sageDomain,
  locale,
  statReport,
  logger,
}: {
  chatTranscript: string;
  sageDomain: string;
  locale: Locale;
  statReport: StatReporter;
  logger: Logger;
}): Promise<
  Array<{
    area: string;
    description: string;
    severity: SageKnowledgeGapSeverity;
    reasoning: string;
    userQuestion?: string;
  }>
> {
  const gapDiscoverySchema = z.object({
    gaps: z
      .array(
        z.object({
          area: z.string().describe("Knowledge area that is missing"),
          description: z.string().describe("Detailed description of what knowledge is needed"),
          severity: z
            .enum(["critical", "important", "nice-to-have"])
            .describe("How critical this gap is")
            .transform((val) => val as SageKnowledgeGapSeverity),
          reasoning: z.string().describe("Why this gap was identified and its impact"),
          userQuestion: z
            .string()
            .optional()
            .describe("The user question that revealed this gap (if any)"),
        }),
      )
      .describe("New knowledge gaps discovered from the conversation"),
  });

  const systemPrompt =
    locale === "zh-CN"
      ? `你是知识缺口发现专家。分析对话内容，识别专家知识库中的缺口。

<识别标准>
1. **Critical**: 用户明确询问但专家无法充分回答的核心问题
2. **Important**: 对话中涉及但专家回答不够深入的领域
3. **Nice-to-have**: 相关但不紧急的知识补充

<注意>
- 只识别真正的知识缺口，不要过度解读
- 如果专家回答得很好，就不要创建 gap
- 关注用户的实际需求和疑问
</注意>`
      : `You are a knowledge gap discovery expert. Analyze the conversation to identify gaps in the expert's knowledge base.

<Criteria>
1. **Critical**: Core questions user asked but expert couldn't answer sufficiently
2. **Important**: Areas touched on but expert's answer lacked depth
3. **Nice-to-have**: Related but non-urgent knowledge supplements

<Note>
- Only identify real knowledge gaps, don't over-interpret
- If expert answered well, don't create a gap
- Focus on user's actual needs and questions
</note>`;

  const userPrompt =
    locale === "zh-CN"
      ? `# 对话内容

${chatTranscript}

# 专家领域

${sageDomain}

请分析以上对话，识别专家知识库中的缺口。`
      : `# Conversation

${chatTranscript}

# Expert Domain

${sageDomain}

Please analyze the conversation above and identify gaps in the expert's knowledge base.`;

  try {
    const result = await generateObject({
      model: llm("gpt-4o"),
      schema: gapDiscoverySchema,
      system: systemPrompt,
      prompt: userPrompt,
      maxRetries: 3,
    });

    if (result.usage.totalTokens) {
      await statReport("tokens", result.usage.totalTokens, {
        reportedBy: "discover new gaps",
      });
    }

    logger.info({
      msg: "Discovered new gaps from chat",
      gapsCount: result.object.gaps.length,
    });

    return result.object.gaps;
  } catch (error) {
    logger.error({
      msg: "Failed to discover new gaps with AI, falling back to empty result",
      error: (error as Error).message,
    });
    return [];
  }
}
