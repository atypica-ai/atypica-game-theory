import "server-only";

import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { generatePodcast } from "@/app/(podcast)/lib/generation";
import { PodcastKind } from "@/app/(podcast)/types";
import { generateAndSaveStudyLog } from "@/app/(study)/agents/studyLog";
import { AnalystKind } from "@/app/(study)/context/types";
import { mergeUserChatContext } from "@/app/(study)/context/utils";
import { AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { syncPodcast as syncPodcastToMeili } from "@/search/lib/sync";
import { waitUntil } from "@vercel/functions";
import { tool } from "ai";
import {
  generatePodcastInputSchema,
  generatePodcastOutputSchema,
  type GeneratePodcastResult,
} from "./types";

export const generatePodcastTool = ({
  userId,
  userChatId,
  locale,
  abortSignal,
  statReport,
  logger: _logger,
}: {
  userId: number;
  userChatId: number;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Generate a podcast script and audio. This creates a complete podcast with both script and audio generation.",
    inputSchema: generatePodcastInputSchema,
    outputSchema: generatePodcastOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ podcastToken }, { messages }): Promise<GeneratePodcastResult> => {
      const logger = _logger.child({
        tool: "generatePodcast",
        podcastToken,
      });

      // Get analyst to access topic, studyLog, and kind
      const userChat = await prisma.userChat.findUniqueOrThrow({
        where: {
          id: userChatId,
          // kind: "study", // 因为有 universal agent, 现在不过滤了
        },
        select: {
          title: true,
          token: true,
          analyst: {
            select: { studyLog: true, topic: true, kind: true },
          },
          context: true,
        },
      });

      let studyLog = userChat.analyst?.studyLog ?? "";

      // 如果 studyLog 没有生成过，先生成，podcast 的内容主要来自 studyLog
      if (studyLog) {
        logger.info("generatePodcast: studyLog found in Analyst");
      } else {
        logger.info("studyLog not found in Analyst, generating studyLog");
        const result = await generateAndSaveStudyLog({
          userId,
          userChatId,
          messages,
          locale,
          abortSignal,
          statReport,
          logger,
        });
        studyLog = result.studyLog;
      }

      // Determine podcast kind based on analyst kind
      const podcastKind =
        userChat.analyst?.kind === AnalystKind.fastInsight
          ? PodcastKind.fastInsight
          : PodcastKind.opinionOriented;
      const kindReason =
        userChat.analyst?.kind === AnalystKind.fastInsight
          ? "Fast insight study - using fastInsight podcast type"
          : "Fixed to opinionOriented for study";

      // Create podcast record with determined kind
      let podcast = await prisma.analystPodcast.create({
        data: {
          userId,
          token: podcastToken,
          instruction: "",
          script: "",
          extra: {
            userChatToken: userChat.token,
            kindDetermination: {
              kind: podcastKind,
              reason: kindReason,
            },
          } satisfies AnalystPodcastExtra,
        },
      });

      // Generate podcast with fixed opinionOriented kind
      await generatePodcast({
        locale,
        studyLog,
        podcast,
        abortSignal,
        statReport,
      });

      // Fetch updated podcast
      podcast = await prisma.analystPodcast
        .findUniqueOrThrow({ where: { id: podcast.id } })
        .then(({ extra, ...podcast }) => ({
          ...podcast,
          extra,
        }));

      // Save podcast token to context
      const existingTokens = userChat.context.podcastTokens || [];
      await mergeUserChatContext({
        id: userChatId,
        context: {
          podcastTokens: Array.from(new Set([...existingTokens, podcast.token])),
        },
      });

      // 异步同步到 Meilisearch
      waitUntil(
        syncPodcastToMeili(podcast.id).catch((error) => {
          logger.error({
            msg: "Failed to sync podcast to search",
            podcastId: podcast.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }),
      );

      return {
        podcastToken: podcast.token,
        plainText: `Podcast generated successfully with token: ${podcast.token}. The podcast includes both script and audio.`,
      };
    },
  });
