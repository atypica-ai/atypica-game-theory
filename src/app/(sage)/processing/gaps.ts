import "server-only";

import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import {
  discoverKnowledgeGapsFromSageChatsSystemPrompt,
  knowledgeGapDiscoverySchema,
} from "@/app/(sage)/prompt/gaps";
import type { SageChatExtra } from "@/app/(sage)/types";
import { SageKnowledgeGapExtra } from "@/app/(sage)/types";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { generateObject, UserModelMessage } from "ai";
import type { Locale } from "next-intl";
import { Logger } from "pino";

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

  // First, get sageChats where extra.relatedGapIds is empty, ordered by id desc, limit 20
  const chatsWithoutGapAnalysis = await prisma.$queryRaw<Array<{ id: number }>>`
    SELECT id
    FROM "SageChat"
    WHERE "sageId" = ${sageId} AND ("extra"::jsonb -> 'gapDiscovered' IS NULL OR "extra"::jsonb -> 'gapDiscovered' != 'true')
    ORDER BY id DESC
    LIMIT 20
  `;
  if (chatsWithoutGapAnalysis.length === 0) {
    logger.info({ msg: "No chats without gap analysis found" });
    return;
  }
  const chatIds = chatsWithoutGapAnalysis.map((chat) => chat.id);
  logger.info({ msg: "Found chats without gap analysis", count: chatIds.length, chatIds });

  // Override the recentSageChats query to use these specific chat IDs

  // Get recent chats with messages
  const recentSageChats = await prisma.sageChat
    .findMany({
      where: {
        sageId,
        id: { in: chatIds },
      },
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
    })
    .then((chats) =>
      chats.map(({ extra, ...sageChat }) => ({ ...sageChat, extra: extra as SageChatExtra })),
    );

  if (recentSageChats.length === 0) {
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
  const chatsContext = recentSageChats
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
    const chatIdToSageChat = new Map(
      recentSageChats.map((sageChat) => [sageChat.userChat.id, sageChat]),
    );
    await prisma.sageKnowledgeGap.createMany({
      data: discoveredGaps.map((gap) => {
        const sourceSageChat = chatIdToSageChat.get(gap.chatId);
        return {
          sageId,
          area: gap.area,
          description: gap.description,
          severity: gap.severity,
          impact: gap.impact,
          extra: {
            sourceChat: sourceSageChat
              ? { id: sourceSageChat.userChat.id, token: sourceSageChat.userChat.token }
              : undefined,
          } satisfies SageKnowledgeGapExtra,
        };
      }),
    });
  }

  // 所有找出来的 chat 都标记，不只是有对应 gap 的标记，每个 chat 只会被处理一次
  await Promise.all(
    recentSageChats.map(async (sageChat) => {
      await mergeExtra({
        tableName: "SageChat",
        id: sageChat.id,
        extra: { gapDiscovered: true } satisfies SageChatExtra,
      });
    }),
  ).catch((error) => {
    logger.error(`Error marking chats as having gaps: ${(error as Error).message}`);
    // throw error;
  });

  logger.info({
    msg: "Batch chat analysis completed",
    chats: recentSageChats.length,
    newGaps: discoveredGaps.length,
  });
}
