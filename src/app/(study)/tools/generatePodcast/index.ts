import "server-only";

import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { generatePodcast } from "@/app/(podcast)/lib/generation";
import { notifyPodcastReady } from "@/app/(podcast)/lib/notify";
import { PodcastKind } from "@/app/(podcast)/types";
import { generateAndSaveStudyLog } from "@/app/(study)/agents/studyLog";
import { AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import {
  generatePodcastInputSchema,
  generatePodcastOutputSchema,
  type GeneratePodcastResult,
} from "./types";

export const generatePodcastTool = ({
  studyUserChatId,
  locale,
  abortSignal,
  statReport,
  logger: _logger,
}: {
  studyUserChatId: number;
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
        where: { id: studyUserChatId, kind: "study" },
        select: {
          analyst: {
            select: {
              id: true,
              topic: true,
              brief: true,
              studyLog: true,
              kind: true,
            },
          },
        },
      });

      let analyst = userChat.analyst;

      if (!analyst) {
        throw new Error("Analyst does not exist for this study");
      }

      // 如果 studyLog 没有生成过，先生成，podcast 的内容主要来自 studyLog
      if (analyst.studyLog) {
        logger.info("generatePodcast: studyLog found in Analyst");
      } else {
        logger.info("studyLog not found in Analyst, generating studyLog");
        const { studyLog } = await generateAndSaveStudyLog({
          analyst,
          messages,
          locale,
          abortSignal,
          statReport,
          logger,
        });
        // 更新 analyst 对象上的 studyLog
        analyst = {
          ...analyst,
          studyLog,
        };
      }

      // Determine podcast kind based on analyst kind
      const podcastKind =
        analyst.kind === "fastInsight" ? PodcastKind.fastInsight : PodcastKind.opinionOriented;
      const kindReason =
        analyst.kind === "fastInsight"
          ? "Fast insight study - using fastInsight podcast type"
          : "Fixed to opinionOriented for study";

      // Create podcast record with determined kind
      let podcast = await prisma.analystPodcast
        .create({
          data: {
            analystId: analyst.id,
            token: podcastToken,
            instruction: "",
            script: "",
            extra: {
              kindDetermination: {
                kind: podcastKind,
                reason: kindReason,
              },
            } as AnalystPodcastExtra,
          },
        })
        .then(({ extra, ...podcast }) => ({
          ...podcast,
          extra: extra as AnalystPodcastExtra,
        }));

      // Generate podcast with fixed opinionOriented kind
      await generatePodcast({
        podcast,
        abortSignal,
        statReport,
      });

      // Fetch updated podcast
      podcast = await prisma.analystPodcast
        .findUniqueOrThrow({ where: { id: podcast.id } })
        .then(({ extra, ...podcast }) => ({
          ...podcast,
          extra: extra as AnalystPodcastExtra,
        }));

      // Notify that podcast is ready
      await notifyPodcastReady({
        analystId: analyst.id,
        podcast: { token: podcast.token },
        logger,
      });

      return {
        podcastToken: podcast.token,
        plainText: `Podcast generated successfully with token: ${podcast.token}. The podcast includes both script and audio.`,
      };
    },
  });
