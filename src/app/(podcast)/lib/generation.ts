import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { podcastScriptPrologue, podcastScriptSystem } from "@/app/(podcast)/prompt";
import { VALID_LOCALES } from "@/i18n/routing";
import { fileUrlToDataUrl } from "@/lib/attachments/actions";
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
import { FilePart, FinishReason, generateText, ModelMessage, stepCountIs, streamText } from "ai";
import { parseBuffer } from "music-metadata";
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

    // Step 3: Generate audio, title, and show notes in parallel
    logger.info("Starting audio and metadata generation in parallel");
    const [{ objectUrl, mimeType, duration, fileSize }, title, showNotes] = await Promise.all([
      generatePodcastAudio({
        podcastId: podcast.id,
        podcastToken: podcast.token,
        script: script,
        locale: locale,
        abortSignal: abortSignal,
        statReport: statReport,
        logger: logger,
      }),
      generatePodcastMetadataTitle({
        script: script,
        locale: locale,
        abortSignal: abortSignal,
        statReport: statReport,
        logger: logger,
      }),
      generatePodcastShowNotes({
        script: script,
        locale: locale,
        abortSignal: abortSignal,
        statReport: statReport,
        logger: logger,
      }),
    ]);

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
          title,
          mimeType,
          duration,
          size: fileSize,
          showNotes,
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

// Generate podcast title from script
export async function generatePodcastMetadataTitle({
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
}): Promise<string> {
  logger.info({ msg: "Starting podcast title generation" });

  const systemPrompt =
    locale === "zh-CN"
      ? "根据播客脚本生成一个吸引眼球的标题。要求简洁（60字以内）、吸引人、抓住核心观点。直接返回标题文本，不要加引号。"
      : "Generate a catchy title based on the podcast script. Keep it concise (under 60 chars), engaging, and capture the key insight. Return the title text only, no quotes.";

  const { text, usage } = await generateText({
    model: llm("gpt-5-mini"),
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
        reasoningEffort: "minimal",
      } satisfies OpenAIResponsesProviderOptions,
    },
    system: systemPrompt,
    prompt: script,
    abortSignal: abortSignal,
  });

  const title = text.trim();

  // Track token usage
  const totalTokens =
    (usage.outputTokens ?? 0) * 3 + (usage.inputTokens ?? 0) || (usage.totalTokens ?? 0);
  if (totalTokens > 0) {
    await statReport("tokens", totalTokens, {
      reportedBy: "generatePodcastMetadataTitle",
      part: "title",
      usage,
    });
  }

  logger.info({ msg: "Podcast title generation completed", title });
  return title;
}

export async function generatePodcastShowNotes({
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
}): Promise<string> {
  logger.info({ msg: "Starting podcast show notes generation" });

  const systemPrompt =
    locale === "zh-CN"
      ? `根据播客脚本生成节目说明（Show Notes）。包括以下内容：

1. 简短摘要（2-3句话）
2. 本期重点话题（3-5个要点）
3. 关键洞察或结论

格式要求：
- 使用 Markdown 格式
- 清晰的段落结构
- 突出关键信息
- 500字以内

直接返回节目说明内容，不要加额外解释。`
      : `Generate Show Notes based on the podcast script. Include:

1. Brief summary (2-3 sentences)
2. Key topics covered (3-5 bullet points)
3. Main insights or conclusions

Format requirements:
- Use Markdown format
- Clear paragraph structure
- Highlight key information
- Under 500 words

Return the show notes content directly, no additional explanation.`;

  const { text, usage } = await generateText({
    model: llm("gpt-5-mini"),
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
        reasoningEffort: "minimal",
      } satisfies OpenAIResponsesProviderOptions,
    },
    system: systemPrompt,
    prompt: script,
    abortSignal: abortSignal,
  });

  const showNotes = text.trim();

  // Track token usage
  const totalTokens =
    (usage.outputTokens ?? 0) * 3 + (usage.inputTokens ?? 0) || (usage.totalTokens ?? 0);
  if (totalTokens > 0) {
    await statReport("tokens", totalTokens, {
      reportedBy: "generatePodcastShowNotes",
      part: "showNotes",
      usage,
    });
  }

  logger.info({ msg: "Podcast show notes generation completed", length: showNotes.length });
  return showNotes;
}

// Pure podcast audio generation function (no auth, renamed from backgroundGeneratePodcastAudioImpl)
export async function generatePodcastAudio({
  // podcastId,
  podcastToken,
  script,
  locale,
  // abortSignal,
  // statReport,  // TODO 目前暂时免费，不消耗 token
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
  duration?: number;
  fileSize: number;
}> {
  try {
    logger.info({ msg: "Starting podcast audio generation" });

    // Create Volcano TTS client
    const volcanoClient = createVolcanoClient(logger);

    // Step 1: Fetch audio from Volcano TTS API (with silence already inserted between rounds)
    const result = await volcanoClient.fetchAudioChunks({
      script: script,
      podcastToken,
      locale,
      logger,
    });

    logger.info({
      msg: "Received audio from Volcano TTS",
      bufferSize: result.audioBuffer.byteLength,
      duration: result.duration,
      mimeType: result.mimeType,
    });

    // Step 2: Get the final audio buffer (already concatenated by the client)
    const finalAudioBuffer = result.audioBuffer;

    logger.info({
      msg: "Audio buffer prepared",
      totalSize: finalAudioBuffer.byteLength,
    });

    // Step 3: Validate audio size (business rule: max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (finalAudioBuffer.byteLength > maxSize) {
      throw new Error(
        `Audio file too large: ${finalAudioBuffer.byteLength} bytes (max ${maxSize} bytes)`,
      );
    }

    // Step 4: Parse audio buffer to get accurate duration
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
        msg: "Failed to parse audio metadata, using Volcano TTS duration as fallback",
        error: error instanceof Error ? error.message : String(error),
      });
      // Use Volcano TTS duration as fallback
      duration = result.duration ? Number(result.duration.toFixed(3)) : undefined;
    }

    // Step 5: Upload to S3
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
