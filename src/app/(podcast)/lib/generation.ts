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

  // Add advertisement at the end of the script
  const prologue = 
    locale === "zh-CN" ? "每份洞察都值得被听见，欢迎来到 “Atypica AI”。" 
    : "Welcome to \"Atypica AI\", every insight deserves an audience.";
  const epilogue = 
    locale === "zh-CN" ? "想了解更多有趣的研究，请关注 “Atypica AI”。" 
    : "Want to learn more about interesting research? Checkout \"Atypica AI\".";
  script = prologue + "\n\n" + script + "\n\n" + epilogue;
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
      ? `根据播客脚本，从普通听众的角度，撰写节目说明（Show Notes）。目的是1. 让听众快速了解播客内容，抓住听众的兴趣；2. 让播客更容易被搜索到。
包括以下内容：
1. 简短的Hook（2-3句话）：
- 【目的】一个好的Hook是成功抓住听众的关键。提前简单的抛出Takeaway可以调动用户听下去的兴趣。通过高吸引力的方式，提出本次研究解决的问题是什么。
- 这个内容对用户应该有很强的吸引力
- 建立"这与我有关"的连接
- 创造"必须听完"的紧迫感
- 避免模糊的形容词（"有意思"、"疯狂"等）
- Hook的几种形式例子：
  - 反常识冲击型：用离谱的现象来调动听众的八卦魂或者强烈好奇心
  - 利益相关型：用贴近生活和工作的利益相关信息，让听众觉得可以获得有益的takeaway
  - 其他的请带入用户角度创造

2. 听众的takeaway（3-5个要点）：
- 【目的】抓住听众的兴趣；让播客更容易被搜索到
- 要求包括所有脚本中提及的热点

格式要求：
格式如以下例子
"""
在北京房价动辄千万的当下，一位90后单亲妈妈做了个"离谱"的决定：不买学区房，直接带女儿住进东二环的五星级酒店上学。周一入住，周五退房，孩子上学像度假。这个看似烧钱的选择，竟然比买房省了几百万？当传统的"学区房信仰"开始松动，她的计算逻辑是否颠覆了我们对教育投资的认知？

🎯 **你将收获的关键洞察**
- 💰 颠覆性的教育成本计算：从机会成本到隐性福利，解码住酒店vs买学区房的真实账本，重新审视"房子=教育"的传统逻辑
- 🏠 "学区房神话"的理性祛魅：生育率下降、政策调整背景下，为什么顶级学区房不再"稳赚不赔"？普通家长如何避免踩坑？
..
"""
- 清晰的段落结构
- 搭配少量Emoji
- 突出关键信息
- 350字以内

直接返回节目说明内容，不要加额外解释。`
      : `Based on the podcast script, write show notes from the perspective of ordinary listeners. The purpose is to: 1. Help listeners quickly understand the podcast content and capture their interest; 2. Make the podcast more discoverable through search.

Include the following content:

1. Short Hook (2-3 sentences):
- **Purpose**: A good hook is key to successfully capturing listeners. Briefly presenting takeaways upfront can stimulate users' interest to keep listening. Present what problem this research solves in a highly attractive way.
- This content should be highly attractive to users
- Establish a "this relates to me" connection
- Create "must listen to the end" urgency
- Avoid vague adjectives ("interesting," "crazy," etc.)
- Examples of hooks:
  - Counter-intuitive impact type: Use outrageous phenomena to trigger listeners' curiosity or strong inquisitiveness
  - Stakeholder interest type: Use life and work-related information to make listeners feel they can gain beneficial takeaways
  - Others: Create from the user's perspective

2. Listener takeaways (3-5 key points):
- **Purpose**: Capture listeners' interest; make the podcast more searchable
- Must include all hot topics mentioned in the script

Format requirements:
Format as the following example:
"""
In today's Beijing where housing prices easily reach tens of millions, a 90s single mother made an "outrageous" decision: instead of buying a school district house, she moved directly into a five-star hotel in the East Second Ring Road with her daughter for schooling. Check in Monday, check out Friday - going to school like going on vacation. This seemingly money-burning choice actually saved millions compared to buying a house? As traditional "school district housing faith" begins to waver, does her calculation logic overturn our understanding of education investment?

🎯 **Key Insights You'll Gain**
- 💰 Disruptive education cost calculation: From opportunity costs to hidden benefits, decode the real ledger of hotel living vs. buying school district housing, re-examine the traditional logic of "house = education"
- 🏠 Rational demystification of "school district housing myth": Against the backdrop of declining birth rates and policy adjustments, why are top school district properties no longer "guaranteed profit"? How can ordinary parents avoid pitfalls?
..
"""
- Clear paragraph structure
- Use minimal emojis
- Highlight key information
- Within 350 words

Return the show notes content directly without additional explanations.`;

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
