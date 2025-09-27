import "server-only";

import { llm, LLMModelName, providerOptions } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { fileUrlToDataUrl } from "@/lib/attachments/actions";
import { uploadToS3 } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { generateToken } from "@/lib/utils";
import { AnalystPodcast, AnalystPodcastExtra, ChatMessageAttachment } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { AnalystKind } from "@/prisma/types";
import { FinishReason, Message, streamText } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { podcastScriptSystem } from "../prompt";
import { createPodcastRecord } from "./data";
import { preprocessScriptForAudio } from "./utils";
import { createVolcanoClient } from "./volcano/client";

// Internal function for podcast script generation
async function generatePodcastScript(params: {
  analystId: number;
  instruction?: string;
  systemPrompt?: string;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
}): Promise<AnalystPodcast> {
  const { analystId, instruction = "", systemPrompt, abortSignal, statReport, logger } = params;

  // Step 1: Fetch analyst
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

  // Step 2: Create podcast record
  const podcastToken = generateToken();
  const podcast = await createPodcastRecord(analyst.id, instruction, podcastToken);

  // Step 3: Setup locale

  const locale: Locale =
    analyst.locale === "zh-CN" || analyst.locale === "en-US"
      ? (analyst.locale as Locale)
      : ((await detectInputLanguage({ text: analyst.brief })) as Locale);


  // Step 5: Initialize processing status
  const processingExtra: AnalystPodcastExtra = {
    processing: {
      startsAt: Date.now(),
      scriptGeneration: false,
      audioGeneration: false,
    },
  };

  await prisma.analystPodcast.update({
    where: { id: podcast.id },
    data: { extra: processingExtra },
  });

  // Step 6: Core script generation logic
  logger.info({
    msg: "Starting podcast script generation",
    analystId: analyst.id,
    podcastId: podcast.id,
  });

  let script = podcast.script; // If podcast has content, continue from existing script

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
        }, 5000); // 5 second throttle
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
    const experimental_attachments = analyst.attachments
      ? await Promise.all(
          (analyst.attachments as ChatMessageAttachment[]).map(
            async ({ name, objectUrl, mimeType }) => {
              const url = await fileUrlToDataUrl({ objectUrl, mimeType });
              return { name, url, contentType: mimeType };
            },
          ),
        )
      : undefined;

    // Create podcast script prompt content
    const podcastContent = `# Podcast Script Generation Request

<User Brief>
${analyst.brief}
</User Brief>

<Research Topic>
${analyst.topic}
</Research Topic>

<Study Summary>
${analyst.studySummary}
</Study Summary>

<Research Process>
${analyst.studyLog}
</Research Process>

Please generate a comprehensive, engaging podcast script based on the above research findings.`;

    const messages: Omit<Message, "id">[] = [
      {
        role: "user",
        content: podcastContent,
        experimental_attachments,
      },
    ];

    if (script) {
      messages.push({ role: "assistant", content: script });
      messages.push({
        role: "user",
        content:
          "Please continue with the remaining podcast script content without repeating what's already been generated.",
      });
    }

    const response = streamText({
      model: llm(modelName),
      providerOptions: providerOptions,
      system: systemPrompt
        ? systemPrompt
        : podcastScriptSystem({
            locale,
            analystKind: (analyst.kind as AnalystKind) || AnalystKind.misc,
          }),
      messages: messages,
      maxSteps: 1,
      maxTokens: 30000,
      onChunk: async ({ chunk }) => {
        if (chunk.type === "text-delta") {
          script += chunk.textDelta.toString();
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
          (usage.completionTokens ?? 0) * 3 + (usage.promptTokens ?? 0) || usage.totalTokens;
        if (totalTokens > 0) {
          await statReport("tokens", totalTokens, {
            reportedBy: "generatePodcastScript",
            part: "script",
            usage,
          });
        }
      },
      onError: async ({ error }) => {
        const msg = (error as Error).message;
        if ((error as Error).name === "AbortError") {
          logger.warn(`Script generation aborted: ${msg}`);
        } else {
          logger.error(`Script generation error: ${msg}`);

          // Update status: script generation failed
          const errorExtra: AnalystPodcastExtra = {
            processing: false,
            error: msg,
          };

          try {
            await prisma.analystPodcast.update({
              where: { id: podcast.id },
              data: { extra: errorExtra },
            });
          } catch (dbError) {
            logger.error({ msg: "Failed to update podcast record with error", dbError });
          }

          reject(error);
        }
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
  // Save final script
  await throttleSaveScript(podcast.id, script, { immediate: true });

  if (finishReason === "length") {
    logger.warn("Podcast script generation hit length limit but completed");
  }

  // Update status: script generation completed
  const completedExtra: AnalystPodcastExtra = {
    processing: {
      startsAt:
        processingExtra.processing !== false && processingExtra.processing
          ? processingExtra.processing.startsAt
          : Date.now(),
      scriptGeneration: true,
      audioGeneration: false,
    },
  };

  await prisma.analystPodcast.update({
    where: { id: podcast.id },
    data: {
      generatedAt: new Date(),
      extra: completedExtra,
    },
  });

  logger.info("Podcast script generation completed successfully");
  return podcast;
}

/**
 * Unified podcast generation function that handles both script and audio generation
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

  // Step 1: Generate script
  const podcast = await generatePodcastScript({
    analystId,
    instruction,
    systemPrompt,
    abortSignal,
    statReport,
    logger,
  });

  // Step 2: Generate audio
  try {
    // Get analyst locale for audio generation
    const analyst = await prisma.analyst.findUnique({
      where: { id: analystId },
      select: { locale: true },
    });

    const locale =
      analyst?.locale === "zh-CN" || analyst?.locale === "en-US"
        ? analyst.locale
        : await detectInputLanguage({ text: podcast.script });

    // Refetch the latest podcast data to ensure we have the current script
    const updatedPodcast = await prisma.analystPodcast.findUnique({
      where: { id: podcast.id },
    });

    if (!updatedPodcast?.script) {
      throw new Error("Script not available for audio generation");
    }

    await generatePodcastAudio(
      updatedPodcast.id,
      updatedPodcast.token,
      updatedPodcast.script,
      locale,
    );

    logger.info("Unified podcast generation completed successfully");
    return updatedPodcast;
  } catch (error) {
    logger.error({
      msg: "Audio generation failed in unified flow",
      error: error instanceof Error ? error.message : String(error),
      podcastId: podcast.id,
    });

    // Mark audio generation as failed but don't throw - script is still available
    const errorExtra: AnalystPodcastExtra = {
      processing: false,
      error: `Audio generation failed: ${error instanceof Error ? error.message : String(error)}`,
    };

    await prisma.analystPodcast.update({
      where: { id: podcast.id },
      data: { extra: errorExtra },
    });

    return podcast;
  }
}

// Pure podcast audio generation function (no auth, renamed from backgroundGeneratePodcastAudioImpl)
export async function generatePodcastAudio(
  podcastId: number,
  podcastToken: string,
  script: string,
  locale: string,
): Promise<void> {
  const logger = rootLogger.child({
    podcastId,
    podcastToken,
    method: "generatePodcastAudio",
  });

  try {
    logger.info("Starting podcast audio generation");

    // Preprocess script for audio generation
    const preprocessedScript = preprocessScriptForAudio(script);
    logger.info({
      msg: "Script preprocessed for audio generation",
      processedLength: preprocessedScript.length,
    });

    // Create Volcano TTS client
    const volcanoClient = createVolcanoClient(logger);

    // Generate audio
    const result = await volcanoClient.generatePodcastAudio({
      script: preprocessedScript,
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

    // Get current extra data to preserve existing processing info
    const currentPodcast = await prisma.analystPodcast.findUnique({
      where: { id: podcastId },
      select: { extra: true },
    });

    const currentExtra = (currentPodcast?.extra || {}) as AnalystPodcastExtra;

    // Update processing status: complete generation (set processing to false)
    const completedExtra: AnalystPodcastExtra = {
      ...currentExtra,
      processing: false, // Mark as completely finished
    };

    // Update database with objectUrl and completed processing status
    await prisma.analystPodcast.update({
      where: { id: podcastId },
      data: {
        objectUrl: objectUrl,
        generatedAt: new Date(),
        extra: completedExtra,
      },
    });

    logger.info({
      msg: "Podcast audio generation completed successfully",
      finalUrl: "[REDACTED]",
      duration: result.duration,
    });
  } catch (error) {
    logger.error({
      msg: "Podcast audio generation failed",
      error: error instanceof Error ? error.message : String(error),
    });

    // Mark as failed by updating the record
    try {
      await prisma.analystPodcast.update({
        where: { id: podcastId },
        data: {
          extra: {
            error: error instanceof Error ? error.message : String(error),
            failedAt: new Date().toISOString(),
          },
        },
      });
    } catch (dbError) {
      logger.error({ msg: "Failed to update podcast record with error", dbError });
    }

    throw error;
  }
}
