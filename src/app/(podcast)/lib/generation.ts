import "server-only";

import { defaultProviderOptions, llm, LLMModelName } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { VALID_LOCALES } from "@/i18n/routing";
import { fileUrlToDataUrl } from "@/lib/attachments/actions";
import { uploadToS3 } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { generateToken } from "@/lib/utils";
import { AnalystPodcast, AnalystPodcastExtra, ChatMessageAttachment } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { AnalystKind } from "@/prisma/types";
import { FilePart, FinishReason, ModelMessage, stepCountIs, streamText } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { podcastScriptPrologue, podcastScriptSystem } from "@/app/(podcast)/prompt";
import { createPodcastRecord } from "./utils";
import { createVolcanoClient } from "./volcano/client";

/**
 * Main podcast generation function that handles both script and audio generation
 * Updates processing status throughout the pipeline
 */
export async function generatePodcast(params: {
  analystId: number;
  instruction?: string;
  systemPrompt?: string;
  abortSignal: AbortSignal;
  statReport: StatReporter;
}): Promise<AnalystPodcast> {
  const { analystId, instruction, systemPrompt, abortSignal, statReport } = params;

  const logger = rootLogger.child({
    analystId,
    method: "generatePodcast",
  });

  logger.info("Starting unified podcast generation");

  // Step 1: Get analyst and create podcast record
  const analyst = await prisma.analyst.findUnique({
    where: { id: analystId },
    include: {
      interviews: {
        select: {
          conclusion: true,
        },
      },
    },
  });

  if (!analyst) {
    throw new Error("Analyst not found");
  }

  // Create podcast record
  const podcastToken = generateToken();
  let podcast = await createPodcastRecord(analyst.id, instruction || "", podcastToken);

  // Setup locale
  const locale: Locale =
    analyst.locale && VALID_LOCALES.includes(analyst.locale as Locale)
      ? (analyst.locale as Locale)
      : ((await detectInputLanguage({ text: analyst.brief })) as Locale);

  // Initialize processing status
  podcast = await prisma.analystPodcast
    .update({
      where: { id: podcast.id },
      data: {
        extra: {
          ...podcast.extra,
          processing: {
            startsAt: Date.now(),
            scriptGeneration: false,
            audioGeneration: false,
          },
        },
      },
    })
    .then(({ extra, ...podcast }) => ({ ...podcast, extra: extra as AnalystPodcastExtra }));

  try {
    // Step 2: Generate script
    logger.info("Starting script generation");
    const script = await generatePodcastScript({
      podcast,
      analyst,
      locale,
      instruction,
      systemPrompt,
      abortSignal,
      statReport,
      logger,
    });

    podcast = await prisma.analystPodcast
      .update({
        where: { id: podcast.id },
        data: {
          extra: {
            ...podcast.extra,
            processing: {
              ...podcast.extra.processing,
              scriptGeneration: true,
              audioGeneration: false,
            },
          },
        },
      })
      .then(({ extra, ...podcast }) => ({ ...podcast, extra: extra as AnalystPodcastExtra }));

    // Step 3: Generate audio
    logger.info("Starting audio generation");
    const objectUrl = await generatePodcastAudio(podcast.id, podcast.token, script, locale);

    // Step 4: Mark as completely finished with generatedAt
    podcast = await prisma.analystPodcast
      .update({
        where: { id: podcast.id },
        data: {
          objectUrl: objectUrl,
          generatedAt: new Date(), // Only set generatedAt when audio is ready
          extra: {
            ...podcast.extra,
            processing: false,
            // processing: {
            //   ...podcast.extra.processing,
            //   scriptGeneration: true,
            //   audioGeneration: true,
            // },
          },
        },
      })
      .then(({ extra, ...podcast }) => ({ ...podcast, extra: extra as AnalystPodcastExtra }));

    logger.info("Unified podcast generation completed successfully");

    // Return the final podcast
    const finalPodcast = await prisma.analystPodcast.findUnique({
      where: { id: podcast.id },
    });

    return finalPodcast!;
  } catch (error) {
    logger.error({
      msg: "Podcast generation failed",
      error: error instanceof Error ? error.message : String(error),
      podcastId: podcast.id,
    });

    // Mark as failed, preserving other extra fields
    const currentExtra =
      ((
        await prisma.analystPodcast.findUnique({
          where: { id: podcast.id },
          select: { extra: true },
        })
      )?.extra as AnalystPodcastExtra) || {};

    const errorExtra: AnalystPodcastExtra = {
      ...currentExtra,
      processing: false,
      error: error instanceof Error ? error.message : String(error),
    };

    await prisma.analystPodcast.update({
      where: { id: podcast.id },
      data: { extra: errorExtra },
    });

    return podcast;
  }
}

// Internal function for podcast script generation
async function generatePodcastScript(params: {
  podcast: AnalystPodcast;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analyst: any;
  locale: Locale;
  instruction?: string;
  systemPrompt?: string;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
  podcastKind?: string; // optional, default handled below
}): Promise<string> {
  // Default podcastKind to "deepDive" if not provided
  const {
    podcast,
    analyst,
    locale,
    instruction,
    systemPrompt,
    abortSignal,
    statReport,
    logger,
    podcastKind = "deepDive",
  } = params;

  // Core script generation logic
  logger.info({
    msg: "Starting podcast script generation",
    analystId: analyst.id,
    podcastId: podcast.id,
  });

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

  const modelName: LLMModelName = "claude-sonnet-4";

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
      instruction,
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
      model: llm(modelName),
      providerOptions: defaultProviderOptions,

      system: systemPrompt
        ? systemPrompt
        : podcastScriptSystem({
            locale,
            podcastKind: podcastKind,
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
export async function generatePodcastAudio(
  podcastId: number,
  podcastToken: string,
  script: string,
  locale: string,
): Promise<string> {
  const logger = rootLogger.child({
    podcastId,
    podcastToken,
    method: "generatePodcastAudio",
  });

  try {
    logger.info("Starting podcast audio generation");

    // Create Volcano TTS client
    const volcanoClient = createVolcanoClient(logger);

    // Generate audio
    const result = await volcanoClient.generatePodcastAudio({
      script: script,
      podcastToken,
      locale,
      logger,
    });

    if (!result.audioUrl) {
      throw new Error("No audio URL returned from Volcano TTS");
    }

    logger.info("Audio generated successfully, downloading from Volcano");

    // Download audio from Volcano URL with size limit
    const audioResponse = await fetch(result.audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
    }

    // Check content length if available
    const contentLength = audioResponse.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      throw new Error(`Audio file too large: ${contentLength} bytes (max 10MB)`);
    }

    // Stream download with size checking
    const maxSize = 10 * 1024 * 1024; // 10MB
    let downloadedSize = 0;
    const chunks: Uint8Array[] = [];

    const reader = audioResponse.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get audio response reader");
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        downloadedSize += value.length;
        if (downloadedSize > maxSize) {
          throw new Error(`Audio file too large: ${downloadedSize} bytes (max 10MB)`);
        }

        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    // Combine chunks into single buffer
    const audioBuffer = new Uint8Array(downloadedSize);
    let offset = 0;
    for (const chunk of chunks) {
      audioBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    logger.info({ msg: "Audio downloaded, uploading to S3", size: audioBuffer.byteLength });

    // Upload to S3 using standardized function
    const keySuffix = `podcasts/${podcastToken}.mp3` as const;
    const { objectUrl } = await uploadToS3({
      keySuffix,
      fileBody: audioBuffer,
      mimeType: "audio/mpeg",
    });

    logger.info({
      msg: "Podcast audio generation completed successfully",
      finalUrl: "[REDACTED]",
      duration: result.duration,
    });

    return objectUrl;
  } catch (error) {
    logger.error({
      msg: "Podcast audio generation failed",
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
