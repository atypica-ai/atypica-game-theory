import "server-only";

import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { addWorkingMemory } from "@/app/(sage)/lib";
import {
  resolveGapsSchema,
  resolveGapsSystemPrompt,
  resolveGapsUserPrologue,
} from "@/app/(sage)/prompt/followup";
import type { SageKnowledgeGapSeverity } from "@/app/(sage)/types";
import { SageKnowledgeGapExtra, WorkingMemoryItem } from "@/app/(sage)/types";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { generateObject } from "ai";
import type { Locale } from "next-intl";
import { Logger } from "pino";

/**
 * Analyze which knowledge gaps are resolved by interview content using AI
 */
export async function resolveGaps({
  sageId,
  sageInterviewId,
  userChat,
  locale,
  logger,
  statReport,
  abortSignal,
}: {
  sageId: number;
  sageInterviewId: number;
  userChat: {
    id: number;
    token: string;
  };
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  abortSignal: AbortSignal;
}): Promise<{
  resolvedGapIds: number[];
  workingMemoryContent: string;
}> {
  const [pendingGaps, messages] = await Promise.all([
    prisma.sageKnowledgeGap
      .findMany({
        where: { sageId, resolvedAt: null },
        orderBy: [{ severity: "asc" }, { id: "desc" }],
      })
      .then((gaps) =>
        gaps.map(({ severity, extra, ...gap }) => ({
          ...gap,
          severity: severity as SageKnowledgeGapSeverity,
          extra: extra as SageKnowledgeGapExtra,
        })),
      ),
    prisma.chatMessage.findMany({
      where: { userChatId: userChat.id },
      orderBy: [{ id: "asc" }],
    }),
  ]);

  // Format interview transcript
  const interviewTranscript = messages
    .map(convertDBMessageToAIMessage)
    .map(
      (msg) =>
        `${msg.role === "user" ? "Interviewee" : "Interviewer"}: ${msg.parts.map((part) => (part.type === "text" ? part.text : "")).join(" ")}`,
    )
    .join("\n");

  const systemPrompt = resolveGapsSystemPrompt({ locale });
  const userPrompt = resolveGapsUserPrologue({ pendingGaps, interviewTranscript, locale });

  const result = await generateObject({
    model: llm("claude-sonnet-4-5"),
    schema: resolveGapsSchema,
    system: systemPrompt,
    prompt: userPrompt,
    maxRetries: 3,
    abortSignal,
  }).catch((error) => {
    logger.error(`Failed to analyze gap resolution: ${(error as Error).message}`);
    throw error;
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

  const resolvedGapIds = result.object.resolvedGapIds;
  const workingMemoryContent = result.object.workingMemory;

  // Only add Working Memory if gaps were resolved and content is not empty
  if (resolvedGapIds.length > 0 && workingMemoryContent.trim()) {
    const workingItem: WorkingMemoryItem = {
      id: `interview-${sageInterviewId}-${Date.now()}`,
      content: workingMemoryContent,
      sourceChat: {
        id: userChat.id,
        token: userChat.token,
      },
      relatedGapIds: resolvedGapIds,
      status: "pending",
    };

    await addWorkingMemory({
      sageId,
      workingItem,
    });

    logger.info({
      msg: "Added working memory from interview",
      length: workingMemoryContent.length,
    });

    // Mark gaps as resolved
    await prisma.sageKnowledgeGap.updateMany({
      where: {
        sageId, // 需要过滤 sageId，以免出现无效的 gapId
        id: { in: resolvedGapIds },
      },
      data: {
        resolvedAt: new Date(),
      },
    });

    await Promise.all(
      resolvedGapIds.map(async (gapId) => {
        const gap = pendingGaps.find((g) => g.id === gapId);
        if (gap) {
          await mergeExtra({
            tableName: "SageKnowledgeGap",
            id: gap.id,
            extra: {
              resolvedChat: {
                id: userChat.id,
                token: userChat.token,
              },
            },
          });
        }
      }),
    );
  }

  return {
    resolvedGapIds,
    workingMemoryContent,
  };
}
