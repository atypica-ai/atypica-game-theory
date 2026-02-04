import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { rootLogger } from "@/lib/logging";
import { stepCountIs, streamText, UIMessageStreamWriter } from "ai";
import { Locale } from "next-intl";
import {
  deleteProcessingStatus,
  generateContentHash,
  readCachedContent,
  readProcessingStatus,
  writeCachedContent,
  writeProcessingStatus,
} from "./cache";
import { getFormatContentSystemPrompt } from "./prompt";

export interface FormatContentOptions {
  content: string;
  locale: Locale;
  userId: number;
  triggeredBy: "frontend" | "backend";
  live?: boolean;
}

export interface FormatContentResult {
  status: "cached" | "processing" | "generated" | "failed";
  formattedHtml?: string;
  error?: string;
}

/**
 * Core formatting function (unified for both streaming and non-streaming scenarios)
 *
 * Usage:
 * - Frontend API: Pass streamWriter for streaming response
 * - Backend trigger: Don't pass streamWriter, function will consume stream internally
 *
 * @param options - Format content options
 * @param streamWriter - Optional writer for streaming output (frontend scenario)
 */
export async function formatContentCore(
  options: FormatContentOptions,
  streamWriter?: UIMessageStreamWriter,
): Promise<FormatContentResult> {
  const { content, locale, userId, triggeredBy, live = true } = options;
  const logger = rootLogger.child({ function: "formatContentCore", triggeredBy });

  const hash = generateContentHash(content);

  // Simple statReport for limited free - only logs, doesn't charge
  const statReport: StatReporter = (async (dimension, value, extra) => {
    logger.info({
      msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
      extra,
      note: "format-content is currently free - tokens not deducted",
    });
  }) satisfies StatReporter;

  // 1. Check cache
  const cached = await readCachedContent(userId, hash);
  if (cached) {
    logger.info({ msg: "Cache hit", hash });
    return {
      status: "cached",
      formattedHtml: cached.formattedHtml,
    };
  }

  // If not live mode and no cache, don't generate
  if (!live) {
    logger.info({ msg: "Not live mode with no cache, skipping generation", hash });
    return {
      status: "failed",
      error: "No cache available in replay mode",
    };
  }

  // 2. Check if already processing by another instance
  const existingProcessing = await readProcessingStatus(userId, hash);
  if (existingProcessing) {
    logger.info({ msg: "Already processing by another instance", hash });
    return {
      status: "processing",
    };
  }

  // 3. Mark as processing
  await writeProcessingStatus(userId, hash, { triggeredBy });
  logger.info({ msg: "Started formatting", hash, contentLength: content.length });

  // 4. Call AI to generate (use streamText for both scenarios)
  const systemPrompt = getFormatContentSystemPrompt(locale);
  const userMessage =
    locale === "zh-CN"
      ? `请将以下内容格式化为结构化的 HTML：\n\n${content}`
      : `Please format the following content into structured HTML:\n\n${content}`;

  const streamTextPromise = new Promise<{ formattedHtml: string }>((resolve, reject) => {
    const response = streamText({
      model: llm("claude-sonnet-4-5"),
      providerOptions: defaultProviderOptions(),
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxOutputTokens: 8000,
      stopWhen: stepCountIs(1),
      onFinish: async ({ usage, providerMetadata, text }) => {
        logger.info({ msg: "Format content completed", usage });
        const totalTokens = calculateStepTokensUsage({ usage, providerMetadata }).tokens;
        logger.info({ msg: "Format completed", hash, totalTokens });
        // Record token usage via statReport (currently free)
        await statReport("tokens", totalTokens, {
          reportedBy: "format-content",
          triggeredBy,
          hash,
        });
        resolve({ formattedHtml: text });
      },
      onError: ({ error }) => {
        logger.error({ msg: "Format content error", error: (error as Error).message });
        reject(error);
      },
    });

    if (streamWriter) {
      streamWriter.merge(response.toUIMessageStream());
    }

    response
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });

  try {
    const { formattedHtml } = await streamTextPromise;
    await writeCachedContent(userId, hash, {
      originalText: content,
      formattedHtml,
    });
    return {
      status: "generated",
      formattedHtml,
    };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    await deleteProcessingStatus(userId, hash);
  }
}
