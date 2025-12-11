import "server-only";

import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { generatePodcast } from "@/app/(podcast)/lib/generation";
import { notifyPodcastReady } from "@/app/(podcast)/lib/notify";
import { PodcastKind } from "@/app/(podcast)/types";
import { rootLogger } from "@/lib/logging";
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
  ...toolCallConfigArgs
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
    execute: async ({ podcastToken }): Promise<GeneratePodcastResult> => {
      const logger = rootLogger.child({
        method: "generatePodcastTool",
        studyUserChatId,
        podcastToken,
      });

      // Get analyst to access topic, studySummary, and kind
      const { analyst } = await prisma.userChat.findUniqueOrThrow({
        where: { id: studyUserChatId, kind: "study" },
        select: {
          analyst: {
            select: {
              id: true,
              topic: true,
              studySummary: true,
              kind: true,
            },
          },
        },
      });

      if (!analyst) {
        throw new Error("Analyst does not exist for this study");
      }

      if (!analyst.studySummary) {
        throw new Error("Deep research results not found. Please run deepResearch tool first.");
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
        abortSignal: toolCallConfigArgs.abortSignal,
        statReport: toolCallConfigArgs.statReport,
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
