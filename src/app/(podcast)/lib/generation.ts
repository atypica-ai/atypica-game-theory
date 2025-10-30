import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { podcastScriptPrologue, podcastScriptSystem } from "@/app/(podcast)/prompt";
import { VALID_LOCALES } from "@/i18n/routing";
import { fileUrlToDataUrl } from "@/lib/attachments/actions";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import {
  Analyst,
  AnalystPodcast,
  AnalystPodcastExtra,
  ChatMessageAttachment,
} from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { FilePart, FinishReason, ModelMessage, stepCountIs, streamText } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { createVolcanoClient } from "./volcano/client";

/**
 * Main podcast generation function that handles both script and audio generation
 * Updates processing status throughout the pipeline
 */
export async function generatePodcast({
  podcast,
  abortSignal,
  statReport,
}: {
  podcast: Omit<AnalystPodcast, "extra"> & { extra: AnalystPodcastExtra };
  abortSignal: AbortSignal;
  statReport: StatReporter;
}): Promise<void> {
  const logger = rootLogger.child({
    analystId: podcast.analystId,
    podcastId: podcast.id,
    method: "generatePodcast",
  });

  logger.info("Starting unified podcast generation");

  // Step 1: Get analyst and create podcast record
  const analyst = await prisma.analyst.findUnique({
    where: { id: podcast.analystId },
  });

  if (!analyst) {
    throw new Error("Analyst not found");
  }

  // Setup locale
  const locale: Locale =
    analyst.locale && VALID_LOCALES.includes(analyst.locale as Locale)
      ? (analyst.locale as Locale)
      : ((await detectInputLanguage({ text: analyst.brief })) as Locale);

  // Initialize processing status
  await prisma.$executeRaw`
    UPDATE "AnalystPodcast"
    SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({
      processing: {
        startsAt: Date.now(),
        scriptGeneration: false,
        audioGeneration: false,
      },
    })}::jsonb,
        "updatedAt" = NOW()
    WHERE "id" = ${podcast.id}
  `;

  // Fetch updated podcast with extra
  podcast = await prisma.analystPodcast
    .findUniqueOrThrow({ where: { id: podcast.id } })
    .then(({ extra, ...podcast }) => ({ ...podcast, extra: extra as AnalystPodcastExtra }));

  try {
    // Step 2: Generate script
    logger.info("Starting script generation");
    const script = await generatePodcastScript({
      podcast,
      analyst,
      locale,
      abortSignal,
      statReport,
      logger,
    });

    await prisma.$executeRaw`
      UPDATE "AnalystPodcast"
      SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({
        processing: {
          startsAt: podcast.extra.processing ? podcast.extra.processing?.startsAt : Date.now(),
          scriptGeneration: true,
          audioGeneration: false,
        },
      })}::jsonb,
          "updatedAt" = NOW()
      WHERE "id" = ${podcast.id}
    `;

    // Fetch updated podcast with extra
    podcast = await prisma.analystPodcast
      .findUniqueOrThrow({ where: { id: podcast.id } })
      .then(({ extra, ...podcast }) => ({ ...podcast, extra: extra as AnalystPodcastExtra }));

    // Step 3: Generate audio
    logger.info("Starting audio generation");
    const { objectUrl, mimeType } = await generatePodcastAudio({
      podcastId: podcast.id,
      podcastToken: podcast.token,
      script: script,
      locale: locale,
      abortSignal: abortSignal,
      statReport: statReport,
      logger: logger,
    });

    // Step 4: Mark as completely finished with generatedAt
    await prisma.analystPodcast.update({
      where: { id: podcast.id },
      data: { objectUrl, generatedAt: new Date() },
    });
    await mergeExtra({
      tableName: "AnalystPodcast",
      id: podcast.id,
      extra: {
        processing: false,
        metadata: {
          mimeType,
        },
      } satisfies AnalystPodcastExtra,
    });

    podcast = await prisma.analystPodcast
      .findUniqueOrThrow({ where: { id: podcast.id } })
      .then(({ extra, ...podcast }) => ({ ...podcast, extra: extra as AnalystPodcastExtra }));

    logger.info("Unified podcast generation completed successfully");
  } catch (error) {
    logger.error({
      msg: "Podcast generation failed",
      error: error instanceof Error ? error.message : String(error),
      podcastId: podcast.id,
    });

    // Mark as failed, preserving other extra fields using Raw SQL
    await prisma.$executeRaw`
      UPDATE "AnalystPodcast"
      SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({
        processing: false,
        error: error instanceof Error ? error.message : String(error),
      })}::jsonb,
          "updatedAt" = NOW()
      WHERE "id" = ${podcast.id}
    `;
  }
}

// Internal function for podcast script generation
async function generatePodcastScript({
  podcast,
  analyst,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  podcast: Omit<AnalystPodcast, "extra"> & { extra: AnalystPodcastExtra };
  analyst: Analyst;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
}): Promise<string> {
  // Core script generation logic
  logger.info({ msg: "Starting podcast script generation" });

  const podcastKind = podcast.extra.kindDetermination?.kind;
  const systemPrompt = podcast.extra.kindDetermination?.systemPrompt;
  if (!podcastKind) {
    throw new Error("Podcast kind determination is missing");
  }

  let script = podcast.script || ""; // If podcast has content, continue from existing script

  const throttleSaveScript = (() => {
    let timerId: NodeJS.Timeout | null = null;

    return async (
      podcastId: number,
      script: string,
      { immediate }: { immediate?: boolean } = {},
    ) => {
      if (immediate) {
        if (timerId) {
          clearTimeout(timerId);
          timerId = null;
        }
        saveNow();
        return;
      }

      if (!timerId) {
        timerId = setTimeout(() => {
          timerId = null;
          saveNow();
        }, 15000); // 15 second throttle
      }

      async function saveNow() {
        try {
          await prisma.analystPodcast.update({
            where: { id: podcastId },
            data: { script },
          });
          logger.info("Podcast script persisted successfully");
        } catch (error) {
          logger.error(`Error persisting podcast script: ${(error as Error).message}`);
        }
      }
    };
  })();

  const streamTextPromise = new Promise<{
    finishReason: FinishReason;
    content: string;
  }>(async (resolve, reject) => {
    // 注意，这里不是 FileUIPart，是 ModelMessage 里的 FilePart
    const fileParts: FilePart[] = await Promise.all(
      ((analyst.attachments ?? []) as ChatMessageAttachment[]).map(
        async ({ name, objectUrl, mimeType }) => {
          const url = await fileUrlToDataUrl({ objectUrl, mimeType });
          return { type: "file", filename: name, data: url, mediaType: mimeType };
        },
      ),
    );

    // Create podcast script prompt content using the prologue function
    const podcastContent = podcastScriptPrologue({
      locale,
      analyst,
      instruction: podcast.instruction,
    });

    const messages: ModelMessage[] = [
      {
        role: "user",
        content: [{ type: "text", text: podcastContent }, ...fileParts],
      },
    ];

    if (script) {
      messages.push({
        role: "assistant",
        content: [{ type: "text", text: script }],
      });
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: "Please continue with the remaining podcast script content without repeating what's already been generated.",
          },
        ],
      });
    }

    const response = streamText({
      model: llm("claude-sonnet-4"),
      providerOptions: defaultProviderOptions,

      system: systemPrompt
        ? systemPrompt
        : podcastScriptSystem({
            locale,
            podcastKind,
          }),

      messages,
      stopWhen: stepCountIs(1),
      maxOutputTokens: 30000,

      onChunk: async ({ chunk }) => {
        if (chunk.type === "text-delta") {
          script += chunk.text.toString();
          await throttleSaveScript(podcast.id, script);
        }
      },

      onFinish: async ({ finishReason, text, usage }) => {
        resolve({
          finishReason: finishReason,
          content: text,
        });
        logger.info({ msg: "Script generation completed", finishReason, usage });
        const totalTokens =
          (usage.outputTokens ?? 0) * 3 + (usage.inputTokens ?? 0) || (usage.totalTokens ?? 0);
        if (totalTokens > 0) {
          await statReport("tokens", totalTokens, {
            reportedBy: "generatePodcastScript",
            part: "script",
            usage,
          });
        }
      },

      onError: async ({ error }) => {
        reject(error);
      },

      abortSignal: abortSignal,
    });

    abortSignal.addEventListener("abort", () => {
      reject(new Error("Script generation aborted"));
    });

    response
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });

  const { finishReason } = await streamTextPromise;

  // Save final script immediately
  await throttleSaveScript(podcast.id, script, { immediate: true });

  if (finishReason === "length") {
    logger.warn("Podcast script generation hit length limit but completed");
  }

  logger.info("Podcast script generation completed successfully");
  return script;
}

// Pure podcast audio generation function (no auth, renamed from backgroundGeneratePodcastAudioImpl)
export async function generatePodcastAudio({
  podcastToken,
  script,
  locale,
  logger,
}: {
  podcastId: number;
  podcastToken: string;
  script: string;
  locale: string;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
}): Promise<{
  objectUrl: string;
  mimeType: string;
}> {
  try {
    logger.info("Starting podcast audio generation");

    // Create Volcano TTS client
    const volcanoClient = createVolcanoClient(logger);

    // Generate audio - now returns S3 objectUrl and mimeType directly
    const result = await volcanoClient.generatePodcastAudio({
      script: script,
      podcastToken,
      locale,
      logger,
    });

    if (!result.objectUrl) {
      throw new Error(result.error || "Failed to generate podcast audio - no object URL returned");
    }

    logger.info({
      msg: "Podcast audio generation completed successfully",
      objectUrl: "[REDACTED]",
      mimeType: result.mimeType,
      duration: result.duration,
    });

    return {
      objectUrl: result.objectUrl,
      mimeType: result.mimeType,
    };
  } catch (error) {
    logger.error({
      msg: "Podcast audio generation failed",
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
