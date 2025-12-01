import "server-only";

import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import {
  addEpisodicMemory,
  addWorkingMemory,
} from "@/app/(sage)/lib";
import { chatGapDiscoverySystem } from "@/app/(sage)/prompt/gaps";
import type { SageKnowledgeGapSeverity } from "@/app/(sage)/types";
import {
  SageInterviewExtra,
  SageKnowledgeGapExtra,
  SageKnowledgeGapResolvedBy,
  WorkingMemoryItem,
} from "@/app/(sage)/types";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { generateObject } from "ai";
import type { Locale } from "next-intl";
import { Logger } from "pino";
import z from "zod";

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
 * 1. Add Episodic Memory (record conversation history)
 *
 * Note: Gap discovery is now done separately via batch analysis
 * (expert manually triggers "Analyze Recent Chats" in the management UI)
 */
export async function endSageChat({
  sageId,
  chatId,
}: {
  sageId: number;
  chatId: number;
}): Promise<{
  episodicMemoryAdded: boolean;
}> {
  const logger = rootLogger.child({ sageId, chatId });

  try {
    const chat = await prisma.sageChat.findUnique({
      where: { id: chatId },
      include: {
        userChat: true,
      },
    });

    if (!chat) {
      throw new Error(`Chat ${chatId} not found`);
    }

    logger.info({
      msg: "Ending sage chat - adding episodic memory",
    });

    // Add Episodic Memory
    await addEpisodicMemory({
      sageId,
      chatId: chat.userChat.token,
    });

    logger.info({
      msg: "Chat ended successfully",
    });

    return {
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
 * Batch analyze recent chats to discover knowledge gaps
 * Triggered manually by expert in Sage Chats management page
 *
 * Performs:
 * 1. Get recent N chats
 * 2. Batch analyze all chats for gaps
 * 3. Create gap records
 */
export async function analyzeSageChatsForGaps({
  sageId,
  limit = 20,
  locale,
}: {
  sageId: number;
  limit?: number;
  locale: Locale;
}): Promise<{
  analyzedChatsCount: number;
  newGapsCount: number;
}> {
  const logger = rootLogger.child({ sageId, action: "analyzeSageChatsForGaps" });

  const statReport: StatReporter = (async (dimension, value, extra) => {
    rootLogger.info({
      msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
      extra,
      note: "analyzeSageChatsForGaps is currently free - tokens not deducted",
    });
  }) as StatReporter;

  try {
    logger.info({
      msg: "Starting batch chat analysis for gaps",
      limit,
    });

    // Get sage info
    const sage = await prisma.sage.findUniqueOrThrow({
      where: { id: sageId },
      select: { id: true, name: true, domain: true },
    });

    // Get recent chats with messages
    const recentChats = await prisma.sageChat.findMany({
      where: { sageId },
      orderBy: { createdAt: "desc" },
      take: limit,
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

    if (recentChats.length === 0) {
      logger.info({ msg: "No chats found for analysis" });
      return {
        analyzedChatsCount: 0,
        newGapsCount: 0,
      };
    }

    // Format all chats into a single context for AI analysis
    const chatsContext = recentChats
      .map((chat, index) => {
        const transcript = chat.userChat.messages
          .map(convertDBMessageToAIMessage)
          .map(
            (msg) =>
              `${msg.role === "user" ? "User" : "Expert"}: ${msg.parts.map((part) => (part.type === "text" ? part.text : "")).join(" ")}`,
          )
          .join("\n");

        return `## Chat ${index + 1} (Token: ${chat.userChat.token})

${transcript}`;
      })
      .join("\n\n---\n\n");

    // AI batch analysis
    const gapDiscoverySchema = z.object({
      gaps: z
        .array(
          z.object({
            chatToken: z
              .string()
              .describe("The userChat token where this gap was identified"),
            area: z.string().describe("Knowledge area that is missing"),
            description: z.string().describe("Detailed description of what knowledge is needed"),
            severity: z
              .enum(["critical", "important", "nice-to-have"])
              .describe("How critical this gap is")
              .transform((val) => val as SageKnowledgeGapSeverity),
            impact: z.string().describe("Why this gap was identified and its impact"),
            userQuestion: z
              .string()
              .optional()
              .describe("The user question that revealed this gap (if any)"),
          }),
        )
        .describe("All knowledge gaps discovered from all conversations"),
    });

    const systemPrompt = chatGapDiscoverySystem({
      sage: { name: sage.name, domain: sage.domain },
      locale,
    });

    const userPrompt =
      locale === "zh-CN"
        ? `# 专家领域

${sage.domain}

# 最近的对话记录

${chatsContext}

请分析以上所有对话，识别专家知识库中的缺口。对于每个 gap，请指明是在哪个对话中发现的（使用 chatToken）。`
        : `# Expert Domain

${sage.domain}

# Recent Conversations

${chatsContext}

Please analyze all conversations above and identify gaps in the expert's knowledge base. For each gap, specify which conversation it was found in (using chatToken).`;

    const result = await generateObject({
      model: llm("gpt-4o"),
      schema: gapDiscoverySchema,
      system: systemPrompt,
      prompt: userPrompt,
      maxRetries: 3,
    });

    if (result.usage.totalTokens) {
      await statReport("tokens", result.usage.totalTokens, {
        reportedBy: "batch analyze chats for gaps",
      });
    }

    const discoveredGaps = result.object.gaps;

    // Create gap records
    if (discoveredGaps.length > 0) {
      await prisma.sageKnowledgeGap.createMany({
        data: discoveredGaps.map((gap) => ({
          sageId,
          area: gap.area,
          description: gap.description,
          severity: gap.severity,
          impact: gap.impact,
          source: {
            type: "conversation",
            userChatToken: gap.chatToken,
            quote: gap.userQuestion || "",
          },
        })),
      });

      logger.info({
        msg: "Batch chat analysis completed",
        analyzedChatsCount: recentChats.length,
        newGapsCount: discoveredGaps.length,
      });
    } else {
      logger.info({
        msg: "Batch chat analysis completed - no gaps found",
        analyzedChatsCount: recentChats.length,
      });
    }

    return {
      analyzedChatsCount: recentChats.length,
      newGapsCount: discoveredGaps.length,
    };
  } catch (error) {
    logger.error({
      msg: "Failed to analyze chats for gaps",
      error: (error as Error).message,
    });
    throw error;
  }
}
