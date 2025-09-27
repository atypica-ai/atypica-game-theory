import "server-only";

import { s3SignedUrl, uploadToS3 } from "@/lib/attachments/s3";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { generateToken } from "@/lib/utils";
import { createVolcanoClient } from "@/lib/volcano/client";
import { Analyst, AnalystPodcast, AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { Logger } from "pino";

// Import required dependencies for script generation
import { llm, LLMModelName, providerOptions } from "@/ai/provider";
import { fileUrlToDataUrl } from "@/lib/attachments/actions";
import { ChatMessageAttachment } from "@/prisma/client";
import { AnalystKind } from "@/prisma/types";
import { FinishReason, generateObject, Message, streamText } from "ai";
import { z } from "zod";

// Import from the prompt location
import { podcastScriptSystem } from "./prompt";
// Import Locale type for proper typing
import { Locale } from "next-intl";

// Helper function to convert podcast objectUrl to signed HTTP URL
export async function podcastObjectUrlToHttpUrl(podcast: AnalystPodcast): Promise<string | null> {
  if (!podcast.objectUrl) {
    return null;
  }

  const { id, objectUrl } = podcast;
  let extra = (podcast.extra || {}) as AnalystPodcastExtra;
  let url: string;

  if (
    extra.s3SignedUrl &&
    extra.s3SignedUrlExpiresAt &&
    extra.s3SignedUrlExpiresAt > Date.now() + 60 * 60 * 1000
  ) {
    // s3SignedUrl exists and expires in the next hour
    url = extra.s3SignedUrl;
  } else {
    const signingDate = new Date();
    const expiresIn = 7 * 24 * 3600; // in seconds
    url = await s3SignedUrl(objectUrl, { signingDate, expiresIn });
    extra = {
      ...extra,
      s3SignedUrl: url,
      s3SignedUrlExpiresAt: signingDate.valueOf() + expiresIn * 1000,
    };
    waitUntil(
      new Promise((resolve) => {
        prisma.analystPodcast
          .update({ where: { id }, data: { extra } })
          .finally(() => resolve(null));
      }),
    );
  }

  return url;
}

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
  analyst?: Analyst & { interviews: { conclusion: string }[] };
  podcast?: AnalystPodcast;
  // Common parameters
  instruction?: string;
  systemPrompt?: string;
  locale?: Locale;
  abortSignal?: AbortSignal;
  statReport?: (dimension: string, value: number, extra?: unknown) => Promise<void>;
  logger?: Logger;
}

// Interface for analyst selection function
export interface AnalystSelectionParams {
  analysts: Analyst[];
  topN?: number;
  systemPrompt?: string;
  logger?: Logger;
}

export interface AnalystSelectionResult {
  selectedAnalystIds: number[];
  reasoning?: string;
}

// ========================================
// PURE BUSINESS LOGIC FUNCTIONS (NO AUTH)
// ========================================

// Pure data fetching function (no auth)
export async function fetchPodcastsForAnalyst(
  analystId: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: number,
): Promise<
  (Pick<
    AnalystPodcast,
    | "id"
    | "token"
    | "analystId"
    | "script"
    | "objectUrl"
    | "generatedAt"
    | "createdAt"
    | "updatedAt"
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
      objectUrl: true,
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
  return (
    script
      // Remove speaker labels like 【A】【B】
      .replace(/【[^】]*】/g, "")
      // Remove excessive newlines (keep single \n, remove multiple)
      .replace(/\n{2,}/g, "\n")
      // Trim whitespace from beginning and end
      .trim()
  );
}

// ========================================
// ANALYST SELECTION USING STRUCTURED LLM OUTPUT
// ========================================

/**
 * Selects the most interesting analysts from a given array using LLM with structured output.
 * Uses generateObject to ensure consistent, structured results.
 */
export async function selectTopAnalysts(
  params: AnalystSelectionParams,
): Promise<AnalystSelectionResult> {
  const { analysts, topN = 1, systemPrompt, logger: providedLogger } = params;

  const logger =
    providedLogger ||
    rootLogger.child({
      method: "selectTopAnalysts",
      analystCount: analysts.length,
      topN,
    });

  // Validate inputs
  if (!analysts || analysts.length === 0) {
    throw new Error("No analysts provided for selection");
  }

  if (topN < 1) {
    throw new Error("topN must be at least 1");
  }

  if (topN > analysts.length) {
    logger.warn("topN is greater than available analysts, selecting all analysts");
  }

  const effectiveTopN = Math.min(topN, analysts.length);

  logger.info("Starting analyst selection", {
    totalAnalysts: analysts.length,
    requestedTopN: topN,
    effectiveTopN,
  });

  // Convert analysts to readable format for LLM
  const analystDescriptions = analysts
    .map((analyst, index) => {
      return `Analyst ${index + 1} (ID: ${analyst.id}):
- Topic: ${analyst.topic || "Not specified"}
- Brief: ${analyst.brief || "No brief available"}
- Role: ${analyst.role || "Not specified"}
- Kind: ${analyst.kind || "misc"}
- Study Summary: ${analyst.studySummary ? analyst.studySummary.substring(0, 300) + "..." : "No summary available"}`;
    })
    .join("\n\n");

  // Create the prompt
  const selectionPrompt = `You are tasked with selecting the ${effectiveTopN} most interesting analyst${effectiveTopN > 1 ? "s" : ""} from the following list based on their research topics, briefs, and content quality.

Consider these criteria for "interesting":
1. Unique or innovative research topics
2. Clear and engaging research briefs
3. Comprehensive study summaries
4. Topics with broad appeal or significance
5. Quality of research depth and insights

Here are the analysts to choose from:

${analystDescriptions}

Please select the top ${effectiveTopN} most interesting analyst${effectiveTopN > 1 ? "s" : ""} and provide their IDs.`;

  // Define the schema for structured output
  const selectionSchema = z.object({
    selectedAnalysts: z
      .array(
        z.object({
          analystId: z.number().describe("The ID of the selected analyst"),
          rank: z
            .number()
            .min(1)
            .max(effectiveTopN)
            .describe("The rank of this analyst (1 being the most interesting)"),
          reason: z.string().describe("Brief reason why this analyst was selected"),
        }),
      )
      .length(effectiveTopN)
      .describe(
        `Exactly ${effectiveTopN} selected analyst${effectiveTopN > 1 ? "s" : ""} in order of interest`,
      ),
    overallReasoning: z
      .string()
      .describe("Brief explanation of the selection criteria and decision process"),
  });

  try {
    const result = await generateObject({
      model: llm("gpt-4.1-nano"),
      providerOptions: providerOptions,
      system:
        systemPrompt ||
        `You are an expert analyst evaluator. Your task is to identify the most interesting and engaging analysts based on their research topics, content quality, and potential appeal to a broad audience. Be objective and consider factors like innovation, clarity, comprehensiveness, and significance.`,
      prompt: selectionPrompt,
      schema: selectionSchema,
      schemaName: "AnalystSelection",
      schemaDescription: `Selection of the top ${effectiveTopN} most interesting analysts`,
      maxRetries: 2,
    });

    console.log(result.object);

    logger.info("Analyst selection completed successfully", {
      selectedCount: result.object.selectedAnalysts.length,
      selectedIds: result.object.selectedAnalysts.map((a) => a.analystId),
    });

    // Sort by rank and extract IDs
    const sortedAnalysts = result.object.selectedAnalysts.sort((a, b) => a.rank - b.rank);
    const selectedAnalystIds = sortedAnalysts.map((analyst) => analyst.analystId);

    // Validate that all selected IDs exist in the original analyst array
    const validIds = analysts.map((a) => a.id);
    const invalidIds = selectedAnalystIds.filter((id) => !validIds.includes(id));

    if (invalidIds.length > 0) {
      logger.warn("LLM selected invalid analyst IDs", { invalidIds });
      throw new Error(`LLM selected invalid analyst IDs: ${invalidIds.join(", ")}`);
    }

    return {
      selectedAnalystIds,
      reasoning: result.object.overallReasoning,
    };
  } catch (error) {
    logger.error("Analyst selection failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `Failed to select analysts: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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
export async function generatePodcastScript(
  params: PodcastScriptGenerationParams,
): Promise<AnalystPodcast> {
  const {
    analystId,
    analyst: providedAnalyst,
    podcast: providedPodcast,
    instruction = "",
    systemPrompt,
    locale: providedLocale,
    abortSignal,
    statReport,
    logger: providedLogger,
  } = params;

  // Step 1: Get or fetch analyst
  let analyst: Analyst & { interviews: { conclusion: string }[] };

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
  const logger =
    providedLogger ||
    rootLogger.child({
      analystId: analyst.id,
      podcastToken: podcast.token,
      method: "generatePodcastScript",
    });

  const locale: Locale =
    providedLocale ||
    (analyst.locale === "zh-CN" || analyst.locale === "en-US"
      ? (analyst.locale as Locale)
      : ((await detectInputLanguage({ text: analyst.brief })) as Locale));

  // Step 4: Setup abort signal and stat reporting
  const finalAbortSignal = abortSignal || new AbortController().signal;
  const finalStatReport =
    statReport ||
    (async (dimension: string, value: number, extra?: unknown) => {
      logger.info(`statReport: ${dimension}=${value}`, extra);
    });

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
  logger.info("Starting podcast script generation", {
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
            logger.error("Failed to update podcast record with error", { dbError });
          }

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

  // Update status: script generation completed
  const completedExtra: AnalystPodcastExtra = {
    processing: {
      startsAt: (processingExtra.processing !== false && processingExtra.processing) ? processingExtra.processing.startsAt : Date.now(),
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

// The legacy generatePodcastScriptForAnalyst function has been removed.
// Server actions now call generatePodcastScript directly for cleaner architecture.

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

    logger.info("Audio downloaded, uploading to S3", { size: audioBuffer.byteLength });

    // Upload to S3 using standardized function
    const keySuffix = `podcasts/${podcastToken}.mp3` as const;
    const { objectUrl } = await uploadToS3({
      keySuffix,
      fileBody: audioBuffer,
      mimeType: "audio/mpeg",
    });

    // Update database with objectUrl (not signed URL)
    await prisma.analystPodcast.update({
      where: { id: podcastId },
      data: {
        objectUrl: objectUrl,
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
          },
        },
      });
    } catch (dbError) {
      logger.error("Failed to update podcast record with error", { dbError });
    }

    throw error;
  }
}

// ========================================
// BATCH PODCAST GENERATION FUNCTIONS
// ========================================

// Interface for batch generation parameters
export interface BatchPodcastGenerationParams {
  batchSize?: number;
  targetCount?: number;
  poolLimit?: number;
}

// Interface for batch generation results
export interface BatchPodcastGenerationResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  selectedAnalystIds: number[];
  results: Array<{
    analystId: number;
    status: "success" | "error";
    error?: string;
    podcastId?: number;
    podcastToken?: string;
  }>;
  summary: {
    poolSize: number;
    selectedCount: number;
    processingTimeMs: number;
  };
}

/**
 * Get analyst pool - analysts with reports, ordered by most recent updates
 */
export async function getAnalystPool(
  limit: number = 10,
): Promise<Array<{ id: number; topic: string }>> {
  const logger = rootLogger.child({ method: "getAnalystPool", limit });

  try {
    const analysts = await prisma.analyst.findMany({
      where: {
        reports: {
          some: {}, // Has at least one AnalystReport
        },
      },
      select: {
        id: true,
        topic: true,
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    logger.info("Analyst pool retrieved", {
      poolSize: analysts.length,
      analystIds: analysts.map((a) => a.id),
    });

    return analysts;
  } catch (error) {
    logger.error("Failed to get analyst pool", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Utility function to chunk array into batches
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Select analysts across batches until target count is reached
 */
export async function selectAnalystsInBatches(
  pool: Array<{ id: number; topic: string }>,
  batchSize: number = 10,
  targetCount: number = 10,
  logger?: Logger,
): Promise<number[]> {
  const log =
    logger ||
    rootLogger.child({
      method: "selectAnalystsInBatches",
      poolSize: pool.length,
      batchSize,
      targetCount,
    });

  if (pool.length === 0) {
    log.warn("Empty analyst pool provided");
    return [];
  }

  // Convert pool to full Analyst objects for selectTopAnalysts
  const fullAnalysts = await prisma.analyst.findMany({
    where: {
      id: { in: pool.map((p) => p.id) },
    },
  });

  const batches = chunkArray(fullAnalysts, batchSize);
  const allSelectedIds: number[] = [];

  log.info("Starting batch selection", {
    batchCount: batches.length,
    targetCount,
  });

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    if (allSelectedIds.length >= targetCount) {
      log.info("Target count reached, stopping batch processing", {
        currentCount: allSelectedIds.length,
        targetCount,
      });
      break;
    }

    const remainingCount = targetCount - allSelectedIds.length;
    const batchTargetCount = Math.min(remainingCount, batch.length);

    try {
      log.info(`Processing batch ${batchIndex + 1}/${batches.length}`, {
        batchSize: batch.length,
        batchTargetCount,
        currentSelectedCount: allSelectedIds.length,
      });

      const batchResult = await selectTopAnalysts({
        analysts: batch,
        topN: batchTargetCount,
        logger: log,
      });

      allSelectedIds.push(...batchResult.selectedAnalystIds);

      log.info(`Batch ${batchIndex + 1} completed`, {
        batchSelectedCount: batchResult.selectedAnalystIds.length,
        totalSelectedCount: allSelectedIds.length,
      });
    } catch (error) {
      log.error(`Batch ${batchIndex + 1} selection failed`, {
        error: error instanceof Error ? error.message : String(error),
        batchSize: batch.length,
      });
      // Continue with next batch on error
    }
  }

  log.info("Batch selection completed", {
    finalSelectedCount: allSelectedIds.length,
    targetCount,
    selectedIds: allSelectedIds,
  });

  return allSelectedIds.slice(0, targetCount); // Ensure we don't exceed target
}

/**
 * Core batch podcast generation function (pure business logic)
 */
export async function batchGeneratePodcasts(
  params: BatchPodcastGenerationParams = {},
): Promise<BatchPodcastGenerationResult> {
  const { batchSize = 10, targetCount = 10, poolLimit = 10 } = params;

  const startTime = Date.now();
  const logger = rootLogger.child({
    method: "batchGeneratePodcasts",
    batchSize,
    targetCount,
    poolLimit,
  });

  logger.info("Starting batch podcast generation");

  try {
    // Step 1: Get analyst pool
    const pool = await getAnalystPool(poolLimit);

    if (pool.length === 0) {
      logger.warn("No analysts found in pool");
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        selectedAnalystIds: [],
        results: [],
        summary: {
          poolSize: 0,
          selectedCount: 0,
          processingTimeMs: Date.now() - startTime,
        },
      };
    }

    // Step 2: Select analysts in batches
    const selectedAnalystIds = await selectAnalystsInBatches(pool, batchSize, targetCount, logger);

    if (selectedAnalystIds.length === 0) {
      logger.warn("No analysts selected from pool");
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        selectedAnalystIds: [],
        results: [],
        summary: {
          poolSize: pool.length,
          selectedCount: 0,
          processingTimeMs: Date.now() - startTime,
        },
      };
    }

    logger.info("Starting podcast generation for selected analysts", {
      selectedCount: selectedAnalystIds.length,
      selectedIds: selectedAnalystIds,
    });

    // Step 3: Process each analyst sequentially
    const results: BatchPodcastGenerationResult["results"] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < selectedAnalystIds.length; i++) {
      const analystId = selectedAnalystIds[i];
      const analystLogger = logger.child({
        analystId,
        progress: `${i + 1}/${selectedAnalystIds.length}`,
      });

      try {
        analystLogger.info("Starting podcast generation for analyst");

        // Step 3a: Generate podcast script
        const podcast = await generatePodcastScript({
          analystId,
          logger: analystLogger,
        });

        // Step 3b: Refetch updated podcast data from database
        const updatedPodcast = await prisma.analystPodcast.findUnique({
          where: { id: podcast.id },
        });

        if (!updatedPodcast) {
          throw new Error(`Podcast record not found after script generation (ID: ${podcast.id})`);
        }

        // Verify script was actually generated and saved
        if (!updatedPodcast.script || updatedPodcast.script.trim().length === 0) {
          throw new Error(`Script generation incomplete - empty script (podcastId: ${podcast.id})`);
        }

        if (!updatedPodcast.generatedAt) {
          throw new Error(
            `Script generation incomplete - no generatedAt timestamp (podcastId: ${podcast.id})`,
          );
        }

        analystLogger.info("Script generation completed", {
          podcastId: updatedPodcast.id,
          podcastToken: updatedPodcast.token,
          scriptLength: updatedPodcast.script.length,
          generatedAt: updatedPodcast.generatedAt,
        });

        // Step 3c: Get analyst locale for audio generation
        const analyst = await prisma.analyst.findUnique({
          where: { id: analystId },
          select: { locale: true },
        });

        const locale =
          analyst?.locale === "zh-CN" || analyst?.locale === "en-US"
            ? analyst.locale
            : await detectInputLanguage({ text: updatedPodcast.script });

        // Step 3d: Generate podcast audio using updated data
        analystLogger.info("Starting audio generation", {
          podcastId: updatedPodcast.id,
          podcastToken: updatedPodcast.token,
          scriptLength: updatedPodcast.script.length,
          locale,
        });

        await generatePodcastAudio({
          podcastId: updatedPodcast.id,
          podcastToken: updatedPodcast.token,
          script: updatedPodcast.script,
          locale,
        });

        analystLogger.info("Audio generation completed successfully", {
          podcastId: updatedPodcast.id,
          podcastToken: updatedPodcast.token,
        });

        results.push({
          analystId,
          status: "success",
          podcastId: updatedPodcast.id,
          podcastToken: updatedPodcast.token,
        });
        successful++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        analystLogger.error("Podcast generation failed for analyst", {
          error: errorMessage,
        });

        results.push({
          analystId,
          status: "error",
          error: errorMessage,
        });
        failed++;

        // Continue with next analyst (no interruption)
      }
    }

    const processingTimeMs = Date.now() - startTime;

    logger.info("Batch podcast generation completed", {
      totalProcessed: selectedAnalystIds.length,
      successful,
      failed,
      processingTimeMs,
    });

    return {
      totalProcessed: selectedAnalystIds.length,
      successful,
      failed,
      selectedAnalystIds,
      results,
      summary: {
        poolSize: pool.length,
        selectedCount: selectedAnalystIds.length,
        processingTimeMs,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Batch podcast generation failed", { error: errorMessage });

    throw new Error(`Batch podcast generation failed: ${errorMessage}`);
  }
}

// Validation helper for API routes (no auth, just validation)
export async function validatePodcastRequest(
  podcastToken: string,
  userId: number,
): Promise<{
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
