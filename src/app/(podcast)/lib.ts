import "server-only";

import { createVolcanoClient } from "@/lib/volcano/client";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import { generateToken } from "@/lib/utils";
import { uploadToS3 } from "@/lib/attachments/s3";
import { Analyst, AnalystPodcast } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { Logger } from "pino";

// Import required dependencies for script generation
import { llm, LLMModelName, providerOptions } from "@/ai/provider";
import { fileUrlToDataUrl } from "@/lib/attachments/actions";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { ChatMessageAttachment } from "@/prisma/client";
import { AnalystKind } from "@/prisma/types";
import { FinishReason, Message, streamText } from "ai";

// Import from the prompt location
import { podcastScriptSystem } from "./prompt";
// Import Locale type for proper typing
import { Locale } from "next-intl";

// Types
export interface PodcastGenerationParams {
  analystId: number;
  instruction?: string;
  systemPrompt?: string;
}

export interface PodcastAudioGenerationParams {
  podcastId: number;
  podcastToken: string;
  script: string;
  locale: string;
}

export interface PodcastCreationParams {
  analystId: number;
  instruction: string;
  token?: string;
}

// Enhanced interface for the unified script generation function
export interface PodcastScriptGenerationParams {
  // Option 1: Provide analystId (will fetch analyst and create podcast record)
  analystId?: number;
  // Option 2: Provide pre-fetched analyst and podcast (for advanced use cases)
  analyst?: Analyst & { interviews: { conclusion: string; }[] };
  podcast?: AnalystPodcast;
  // Common parameters
  instruction?: string;
  systemPrompt?: string;
  locale?: Locale;
  abortSignal?: AbortSignal;
  statReport?: (dimension: string, value: number, extra?: any) => Promise<void>;
  logger?: Logger;
}

// ========================================
// PURE BUSINESS LOGIC FUNCTIONS (NO AUTH)
// ========================================

// Pure data fetching function (no auth)
export async function fetchPodcastsForAnalyst(
  analystId: number, 
  userId: number
): Promise<
  (Pick<
    AnalystPodcast,
    "id" | "token" | "analystId" | "script" | "podcastUrl" | "generatedAt" | "createdAt" | "updatedAt"
  > & { analyst: Analyst })[]
> {
  // Verify ownership
  const analyst = await prisma.analyst.findUnique({
    where: { id: analystId },
  });
  if (!analyst) {
    throw new Error("Analyst not found");
  }

  const podcasts = await prisma.analystPodcast.findMany({
    where: {
      analystId: analyst.id,
    },
    select: {
      id: true,
      token: true,
      analystId: true,
      analyst: true,
      script: true,
      podcastUrl: true,
      generatedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  
  return podcasts;
}

// Core podcast record creation
export async function createPodcastRecord(params: PodcastCreationParams): Promise<AnalystPodcast> {
  const { analystId, instruction, token = generateToken() } = params;
  
  return await prisma.analystPodcast.create({
    data: {
      analystId,
      instruction,
      token,
      script: "",
    },
  });
}

// Script preprocessing for audio generation
function preprocessScriptForAudio(script: string): string {
  return script
    // Remove speaker labels like 【A】【B】
    .replace(/【[^】]*】/g, '')
    // Remove excessive newlines (keep single \n, remove multiple)
    .replace(/\n{2,}/g, '\n')
    // Trim whitespace from beginning and end
    .trim();
}

// ========================================
// UNIFIED PODCAST SCRIPT GENERATION
// ========================================

/**
 * Unified podcast script generation function that handles both use cases:
 * 1. Direct analyst ID (fetches analyst, creates podcast record)
 * 2. Pre-provided analyst and podcast objects (for advanced use cases)
 * 
 * This function is now simplified and purely synchronous.
 */
export async function generatePodcastScript(params: PodcastScriptGenerationParams): Promise<AnalystPodcast> {
  const { 
    analystId, 
    analyst: providedAnalyst, 
    podcast: providedPodcast,
    instruction = "", 
    systemPrompt,
    locale: providedLocale,
    abortSignal,
    statReport,
    logger: providedLogger
  } = params;

  // Step 1: Get or fetch analyst
  let analyst: Analyst & { interviews: { conclusion: string; }[] };
  
  if (providedAnalyst) {
    analyst = providedAnalyst;
  } else if (analystId) {
    const fetchedAnalyst = await prisma.analyst.findUnique({
      where: { id: analystId },
      include: {
        interviews: {
          select: {
            conclusion: true,
          },
        },
      },
    });
    
    if (!fetchedAnalyst) {
      throw new Error("Analyst not found");
    }
    analyst = fetchedAnalyst;
  } else {
    throw new Error("Either analystId or analyst object must be provided");
  }

  // Step 2: Get or create podcast record
  let podcast: AnalystPodcast;
  
  if (providedPodcast) {
    podcast = providedPodcast;
  } else {
    const podcastToken = generateToken();
    podcast = await createPodcastRecord({
      analystId: analyst.id,
      instruction,
      token: podcastToken,
    });
  }

  // Step 3: Setup logging and locale
  const logger = providedLogger || rootLogger.child({
    analystId: analyst.id,
    podcastToken: podcast.token,
    method: "generatePodcastScript",
  });

  const locale: Locale = providedLocale || 
    (analyst.locale === "zh-CN" || analyst.locale === "en-US"
      ? analyst.locale as Locale
      : await detectInputLanguage({ text: analyst.brief }) as Locale);

  // Step 4: Setup abort signal and stat reporting
  const finalAbortSignal = abortSignal || new AbortController().signal;
  const finalStatReport = statReport || (async (dimension: string, value: number, extra?: any) => {
    logger.info(`statReport: ${dimension}=${value}`, extra);
  });

  // Step 5: Core script generation logic
  logger.info("Starting podcast script generation", { 
    analystId: analyst.id, 
    podcastId: podcast.id 
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

  let modelName: LLMModelName = "claude-sonnet-4";
  
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
        content: "Please continue with the remaining podcast script content without repeating what's already been generated.",
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
        logger.info("Script generation completed", { finishReason, usage });
        const totalTokens =
          (usage.completionTokens ?? 0) * 3 + (usage.promptTokens ?? 0) || usage.totalTokens;
        if (totalTokens > 0 && finalStatReport) {
          await finalStatReport("tokens", totalTokens, {
            reportedBy: "generatePodcastScript",
            part: "script",
            usage,
          });
        }
      },
      onError: ({ error }) => {
        const msg = (error as Error).message;
        if ((error as Error).name === "AbortError") {
          logger.warn(`Script generation aborted: ${msg}`);
        } else {
          logger.error(`Script generation error: ${msg}`);
          reject(error);
        }
      },
      abortSignal: finalAbortSignal,
    });

    finalAbortSignal.addEventListener("abort", () => {
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

  await prisma.analystPodcast.update({
    where: { id: podcast.id },
    data: { generatedAt: new Date() },
  });

  logger.info("Podcast script generation completed successfully");
  return podcast;
}

/**
 * Legacy wrapper function for backward compatibility with background processing
 * @deprecated Use generatePodcastScript instead for new implementations
 */
export async function generatePodcastScriptForAnalyst(
  params: PodcastGenerationParams
): Promise<void> {
  const logger = rootLogger.child({
    analystId: params.analystId,
    method: "generatePodcastScriptForAnalyst",
  });

  // Handle background processing at this level using waitUntil
  waitUntil(
    (async () => {
      try {
        await generatePodcastScript({
          analystId: params.analystId,
          instruction: params.instruction,
          systemPrompt: params.systemPrompt,
        });
      } catch (error) {
        logger.error("Background podcast script generation failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    })()
  );
}

// Pure podcast audio generation function (no auth, renamed from backgroundGeneratePodcastAudioImpl)
export async function generatePodcastAudio(params: PodcastAudioGenerationParams): Promise<void> {
  const { podcastId, podcastToken, script, locale } = params;
  
  const logger = rootLogger.child({
    podcastId,
    podcastToken,
    method: "generatePodcastAudio",
  });

  try {
    logger.info("Starting podcast audio generation");

    // Preprocess script for audio generation
    const preprocessedScript = preprocessScriptForAudio(script);
    logger.info("Script preprocessed for audio generation", { 
      processedLength: preprocessedScript.length
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
    const contentLength = audioResponse.headers.get('content-length');
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

    logger.info("Audio downloaded, uploading to S3", { size: audioBuffer.byteLength });

    // Upload to S3 using standardized function
    const keySuffix = `podcasts/${podcastToken}.mp3` as const;
    const { getObjectUrl, objectUrl } = await uploadToS3({
      keySuffix,
      fileBody: audioBuffer,
      mimeType: "audio/mpeg",
    });

    // Use signed URL for audio playback and download
    const finalUrl = getObjectUrl;

    // Update database with final URL
    await prisma.analystPodcast.update({
      where: { id: podcastId },
      data: {
        podcastUrl: finalUrl,
        generatedAt: new Date(),
      },
    });

    logger.info("Podcast audio generation completed successfully", {
      finalUrl: "[REDACTED]",
      duration: result.duration,
    });

  } catch (error) {
    logger.error("Podcast audio generation failed", {
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
          }
        },
      });
    } catch (dbError) {
      logger.error("Failed to update podcast record with error", { dbError });
    }

    throw error;
  }
}

// Validation helper for API routes (no auth, just validation)
export async function validatePodcastRequest(podcastToken: string, userId: number): Promise<{
  podcast: AnalystPodcast & { analyst: Analyst };
  locale: string;
}> {
  // Fetch podcast and validate ownership
  const podcast = await prisma.analystPodcast.findUnique({
    where: { token: podcastToken },
    include: {
      analyst: true,
    },
  });

  if (!podcast) {
    throw new Error("Podcast not found");
  }

  if (podcast.analyst.userId !== userId) {
    throw new Error("Unauthorized");
  }

  // Check if script exists
  if (!podcast.script || podcast.script.trim().length === 0) {
    throw new Error("No script available for audio generation");
  }

  // Detect locale
  const locale =
    podcast.analyst.locale === "zh-CN" || podcast.analyst.locale === "en-US"
      ? podcast.analyst.locale
      : await detectInputLanguage({ text: podcast.script });

  return { podcast, locale };
} 