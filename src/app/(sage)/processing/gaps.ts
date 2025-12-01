import "server-only";

import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { addWorkingMemory } from "@/app/(sage)/lib";
import {
  discoverKnowledgeGapsFromSageChatsSystemPrompt,
  knowledgeGapDiscoverySchema,
} from "@/app/(sage)/prompt/gaps";
import type { SageKnowledgeGapSeverity } from "@/app/(sage)/types";
import { SageInterviewExtra, SageKnowledgeGapExtra, WorkingMemoryItem } from "@/app/(sage)/types";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { generateObject, UserModelMessage } from "ai";
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
}): Promise<number[]> {
  if (pendingGaps.length === 0) {
    return [];
  }

  const gapResolutionSchema = z.object({
    resolvedGapIds: z
      .array(z.number())
      .describe("List of gap IDs that were resolved by the interview content"),
  });

  const systemPrompt =
    locale === "zh-CN"
      ? `你是一个知识缺口分析专家。你的任务是分析访谈内容是否解决了专家知识库中的知识缺口。

对于每个知识缺口，请判断：
1. 访谈内容是否讨论了该缺口涉及的主题
2. 讨论是否提供了有价值的信息来填补该缺口

判断标准：
- 访谈内容充分讨论了该主题，提供了实质性的信息 → 标记为已解决
- 访谈内容仅略微涉及该主题 → 不标记为已解决

请客观分析，不要过度解读。只返回确实被解决的 gap ID 列表。`
      : `You are a knowledge gap analysis expert. Your task is to analyze whether interview content resolves knowledge gaps in the expert's knowledge base.

For each knowledge gap, determine:
1. Whether the interview discusses the topic of this gap
2. Whether the discussion provides valuable information to fill this gap

Judgment criteria:
- Interview sufficiently discusses the topic with substantial information → Mark as resolved
- Interview only briefly touches on the topic → Do not mark as resolved

Please analyze objectively without over-interpreting. Only return gap IDs that are truly resolved.`;

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

请分析以上访谈内容是否解决了这些知识缺口，返回已解决的 gap ID 列表。`
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

Please analyze whether the interview content resolves these knowledge gaps and return the list of resolved gap IDs.`;

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
      resolvedCount: result.object.resolvedGapIds.length,
    });

    return result.object.resolvedGapIds;
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
 * 3. Mark gaps as resolved
 * 4. Update interview status to completed
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
    const resolvedGapIds = await analyzeGapResolution({
      interviewTranscript,
      pendingGaps,
      locale,
      statReport,
      logger,
    });

    let workingMemoryAdded = false;

    // Only add Working Memory if gaps were resolved
    if (resolvedGapIds.length > 0) {
      const workingItem: WorkingMemoryItem = {
        id: `interview-${interviewId}-${Date.now()}`,
        content: `# Knowledge from Interview\n\n${interviewTranscript}`,
        sourceChat: {
          id: interview.userChat.id,
          token: interview.userChat.token,
        },
        relatedGapIds: resolvedGapIds,
        status: "pending",
      };

      await addWorkingMemory({
        sageId,
        workingItem,
      });

      workingMemoryAdded = true;

      // Mark gaps as resolved
      await prisma.sageKnowledgeGap.updateMany({
        where: { id: { in: resolvedGapIds } },
        data: {
          resolvedAt: new Date(),
        },
      });

      // Update each gap's extra field with resolvedChat
      for (const gapId of resolvedGapIds) {
        const gap = pendingGaps.find((g) => g.id === gapId);
        if (gap) {
          await prisma.sageKnowledgeGap.update({
            where: { id: gapId },
            data: {
              extra: {
                ...gap.extra,
                resolvedChat: {
                  id: interview.userChat.id,
                  token: interview.userChat.token,
                },
              },
            },
          });
        }
      }

      logger.info({
        msg: "Resolved gaps and added working memory",
        resolvedCount: resolvedGapIds.length,
      });
    } else {
      logger.info({
        msg: "No gaps resolved, working memory not added",
      });
    }

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
 * Batch analyze recent chats to discover knowledge gaps
 * Triggered manually by expert in Sage Chats management page
 *
 * Performs:
 * 1. Get recent N chats
 * 2. Batch analyze all chats for gaps
 * 3. Create gap records
 */
export async function discoverKnowledgeGapsFromSageChats({
  sageId,
  limit = 20,
  locale,
  logger,
  statReport,
  abortSignal,
}: {
  sageId: number;
  limit?: number;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  abortSignal: AbortSignal;
}) {
  logger.info({ msg: "Starting batch chat analysis for gaps", limit });

  const sage = await prisma.sage.findUniqueOrThrow({
    where: { id: sageId },
    select: { id: true, name: true, domain: true },
  });

  // Get recent chats with messages
  const recentChats = await prisma.sageChat.findMany({
    where: { sageId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      userChat: {
        select: {
          id: true,
          token: true,
          messages: {
            orderBy: { id: "asc" },
          },
        },
      },
      extra: true,
    },
  });

  if (recentChats.length === 0) {
    logger.info({ msg: "No chats found for analysis" });
    return;
  }

  /**
   * Format all chats into a single context for AI analysis
   *
   * ## Chat 1 (Token: xxx)
   * (TRANSCRIPT)
   *
   * ## Chat 2 (Token: xxx)
   * (TRANSCRIPT)
   * ...
   */
  const chatsContext = recentChats
    .map((chat, index) => {
      const transcript = chat.userChat.messages
        .map(convertDBMessageToAIMessage)
        .map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Expert"}: ${msg.parts.map((part) => (part.type === "text" ? part.text : "")).join(" ")}`,
        )
        .join("\n");
      return `## Chat ${index + 1} (ID: ${chat.userChat.id})\n${transcript}`;
    })
    .join("\n\n---\n\n");

  const systemPrompt = discoverKnowledgeGapsFromSageChatsSystemPrompt({
    sage: { name: sage.name, domain: sage.domain },
    locale,
  });

  const messages: UserModelMessage[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            locale === "zh-CN"
              ? `请分析以上所有对话，识别专家知识库中的缺口。对于每个 gap，请指明是在哪个对话中发现的（使用 Chat ID）。\n# 专家领域: ${sage.domain}\n# 最近的对话记录\n`
              : `Please analyze all conversations above and identify gaps in the expert's knowledge base. For each gap, specify which conversation it was found in (using Chat ID).\n# Expert Domain: ${sage.domain}\n# Recent Conversations\n`,
        },
      ],
    },
    { role: "user", content: [{ type: "text", text: chatsContext }] },
  ];

  const result = await generateObject({
    model: llm("gpt-5-mini"),
    providerOptions: {
      openai: {
        reasoningSummary: "auto", // 'auto' | 'detailed'
        reasoningEffort: "minimal", // 'minimal' | 'low' | 'medium' | 'high'
      } satisfies OpenAIResponsesProviderOptions,
    },
    schema: knowledgeGapDiscoverySchema,
    system: systemPrompt,
    messages,
    maxRetries: 3,
    abortSignal,
  }).catch((error) => {
    logger.error(`Error discovering knowledge gaps: ${(error as Error).message}`);
    throw error;
  });

  if (result.usage.totalTokens) {
    await statReport("tokens", result.usage.totalTokens, {
      reportedBy: "discover knowledge gaps",
    });
  }

  const discoveredGaps = result.object.gaps;
  if (discoveredGaps.length > 0) {
    const chatTokenToUserChat = new Map(
      recentChats.map((chat) => [
        chat.userChat.id,
        { id: chat.userChat.id, token: chat.userChat.token },
      ]),
    );
    await prisma.sageKnowledgeGap.createMany({
      data: discoveredGaps.map((gap) => {
        const sourceChat = chatTokenToUserChat.get(gap.chatId);
        return {
          sageId,
          area: gap.area,
          description: gap.description,
          severity: gap.severity,
          impact: gap.impact,
          extra: {
            sourceChat: sourceChat ? { id: sourceChat.id, token: sourceChat.token } : undefined,
          } satisfies SageKnowledgeGapExtra,
        };
      }),
    });
  }

  logger.info({
    msg: "Batch chat analysis completed",
    chats: recentChats.length,
    newGaps: discoveredGaps.length,
  });
}
