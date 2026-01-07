import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { podcastScriptPrologue, podcastScriptSystem } from "@/app/(podcast)/prompt";
import { podcastMetadataSchema, podcastMetadataSystem } from "@/app/(podcast)/prompt/metadata";
import { VALID_LOCALES } from "@/i18n/routing";
import { fileUrlToDataUrl } from "@/lib/attachments/lib";
import { uploadToS3 } from "@/lib/attachments/s3";
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
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { FilePart, FinishReason, generateObject, ModelMessage, stepCountIs, streamText } from "ai";
import { parseBuffer } from "music-metadata";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { getHostCountForPodcastType } from "../types";
import { generatePodcastCoverImage } from "./coverImage";
import { getTTSClient, selectTTSEngine } from "./selectEngine";

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

    // Step 3: Determine hostCount based on podcastType
    const podcastKind = podcast.extra.kindDetermination?.kind;
    if (!podcastKind) {
      throw new Error("Podcast kind determination is missing");
    }
    const hostCount = getHostCountForPodcastType(podcastKind);
    logger.info({
      msg: "Determined hostCount from podcastType",
      podcastKind,
      hostCount,
    });

    // Step 4: Generate audio, metadata, and cover image in parallel
    logger.info("Starting audio, metadata, and cover image generation in parallel");
    const [{ objectUrl, mimeType, duration, fileSize }, { title, showNotes }, { coverObjectUrl }] =
      await Promise.all([
        generatePodcastAudio({
          podcastId: podcast.id,
          podcastToken: podcast.token,
          script: script,
          locale: locale,
          hostCount: hostCount,
          abortSignal: abortSignal,
          statReport: statReport,
          logger: logger,
        }),
        generatePodcastMetadata({
          script: script,
          locale: locale,
          abortSignal: abortSignal,
          statReport: statReport,
          logger: logger,
        }),
        generatePodcastCoverImage({
          ratio: "landscape",
          analyst,
          podcast,
          script,
          locale: locale === "en-US" ? "en-US" : "en-US", // 中文现在容易出现乱码，暂时都用英文
          abortSignal,
          statReport,
          logger,
        }).catch((error) => {
          logger.error(`Failed to generate podcast cover image: ${(error as Error).message}`);
          return { coverObjectUrl: undefined };
        }),
      ]);

    // Step 5: Mark as completely finished with generatedAt
    await prisma.analystPodcast.update({
      where: { id: podcast.id },
      data: { objectUrl, generatedAt: new Date() },
    });
    // Note: coverObjectUrl was already saved in generatePodcastCoverImage,
    // but re-saving the entire metadata object here is safe and ensures consistency
    await mergeExtra({
      tableName: "AnalystPodcast",
      id: podcast.id,
      extra: {
        processing: false,
        metadata: {
          title,
          mimeType,
          duration,
          size: fileSize,
          showNotes,
          coverObjectUrl,
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
      model: llm("claude-sonnet-4-5"),
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

  // Note: Prologue and epilogue are now handled as pre-recorded audio chunks
  // in the audio generation pipeline, not as text in the script.
  // Save final script immediately
  await throttleSaveScript(podcast.id, script, { immediate: true });

  if (finishReason === "length") {
    logger.warn("Podcast script generation hit length limit but completed");
  }

  logger.info("Podcast script generation completed successfully");
  return script;
}

// Generate podcast metadata (title and show notes) in a single call
export async function generatePodcastMetadata({
  script,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  script: string;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
}): Promise<{ title: string; showNotes: string }> {
  logger.info({ msg: "Starting podcast metadata generation (title + show notes)" });

  const result = await generateObject({
    model: llm("gpt-5-mini"),
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
        reasoningEffort: "minimal",
      } satisfies OpenAIResponsesProviderOptions,
    },
    system: podcastMetadataSystem(locale),
    prompt: script,
    schema: podcastMetadataSchema,
    schemaName: "PodcastMetadata",
    schemaDescription: "Generate both title and show notes for the podcast",
    abortSignal: abortSignal,
    maxRetries: 2,
  });

  const { title, showNotes } = result.object;

  // Track token usage
  const totalTokens =
    (result.usage.outputTokens ?? 0) * 3 + (result.usage.inputTokens ?? 0) ||
    (result.usage.totalTokens ?? 0);
  if (totalTokens > 0) {
    await statReport("tokens", totalTokens, {
      reportedBy: "generatePodcastMetadata",
      part: "metadata",
      usage: result.usage,
    });
  }

  logger.info({
    msg: "Podcast metadata generation completed",
    title,
    showNotesLength: showNotes.length,
  });

  return { title, showNotes };
}

// Pure podcast audio generation function (no auth, renamed from backgroundGeneratePodcastAudioImpl)
export async function generatePodcastAudio({
  // podcastId,
  podcastToken,
  script,
  locale,
  hostCount,
  // abortSignal,
  // statReport,  // TODO 目前暂时免费，不消耗 token
  logger,
}: {
  podcastId: number;
  podcastToken: string;
  script: string;
  locale: string;
  hostCount: 1 | 2;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
}): Promise<{
  objectUrl: string;
  mimeType: string;
  duration?: number;
  fileSize: number;
}> {
  try {
    logger.info({ msg: "Starting podcast audio generation", hostCount });

    // Step 1: Select appropriate TTS engine
    const engineType = selectTTSEngine(hostCount, locale, logger);
    const client = getTTSClient(engineType, logger);

    logger.info({
      msg: "Selected TTS engine",
      engine: engineType,
      locale,
      scriptLength: script.length,
    });

    // Step 2: Fetch audio from selected TTS engine
    const result = await client.fetchAudioChunks({
      script: script,
      podcastToken,
      hostCount,
      locale,
      logger,
    });

    logger.info({
      msg: `Received audio from ${engineType}`,
      bufferSize: result.audioBuffer.byteLength,
      duration: result.duration,
      mimeType: result.mimeType,
    });

    // Step 3: Get the final audio buffer (already concatenated by the engine)
    const finalAudioBuffer = result.audioBuffer;

    logger.info({
      msg: "Audio buffer prepared",
      totalSize: finalAudioBuffer.byteLength,
    });

    // Step 4: Validate audio size (business rule: max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (finalAudioBuffer.byteLength > maxSize) {
      throw new Error(
        `Audio file too large: ${finalAudioBuffer.byteLength} bytes (max ${maxSize} bytes)`,
      );
    }

    // Step 5: Parse audio buffer to get accurate duration
    let duration: number | undefined;
    try {
      logger.info({ msg: "Parsing audio metadata from buffer" });
      const metadata = await parseBuffer(Buffer.from(finalAudioBuffer), {
        mimeType: result.mimeType,
      });

      duration = metadata.format.duration ? Number(metadata.format.duration.toFixed(3)) : undefined;

      logger.info({
        msg: "Audio metadata parsed successfully",
        duration,
        codec: metadata.format.codec,
      });
    } catch (error) {
      logger.warn({
        msg: "Failed to parse audio metadata, using TTS duration as fallback",
        error: error instanceof Error ? error.message : String(error),
      });
      // Use TTS duration as fallback (if available)
      duration = result.duration ? Number(result.duration.toFixed(3)) : undefined;
    }

    // Step 6: Upload to S3
    const keySuffix = `podcasts/${podcastToken}.mp3` as const;
    const { objectUrl } = await uploadToS3({
      keySuffix,
      fileBody: finalAudioBuffer,
      mimeType: result.mimeType,
    });

    logger.info({
      msg: "Podcast audio generation completed successfully",
      duration,
      finalSize: finalAudioBuffer.byteLength,
    });

    return {
      objectUrl,
      mimeType: result.mimeType,
      duration,
      fileSize: finalAudioBuffer.byteLength,
    };
  } catch (error) {
    logger.error({
      msg: "Podcast audio generation failed",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
}
