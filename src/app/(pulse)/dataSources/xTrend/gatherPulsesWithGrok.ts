import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { xai } from "@ai-sdk/xai";
import { ModelMessage, streamText, ToolSet, TypeValidationError } from "ai";
import type { Locale } from "next-intl";
import { Logger } from "pino";
import { gatherPulsesContinuation, gatherPulsesSystem } from "./prompt";

type RawPulse = { categoryName: string; title: string; content: string };

const SEARCH_LOOPS = 2;

/**
 * Parse pulses from text output
 * Format: "Title: [title]\nDescription: [description]"
 */
function parsePulsesFromText(text: string): RawPulse[] {
  const pulses: RawPulse[] = [];
  if (!text) return pulses;

  const lines = text.split("\n");
  let currentTitle: string | null = null;
  let currentContent: string | null = null;

  for (const line of lines) {
    const cleanLine = line.replace(/^\*+|\*+$/g, ""); // strip away **
    const titleMatch = cleanLine.match(/^Title:\s*(.+)$/i);
    const descMatch = cleanLine.match(/^Description:\s*(.+)$/i);

    if (titleMatch) {
      if (currentTitle && currentContent) {
        pulses.push({
          categoryName: "",
          title: currentTitle.trim(),
          content: currentContent.trim(),
        });
      }
      currentTitle = titleMatch[1].trim();
      currentContent = null;
    } else if (descMatch && currentTitle) {
      currentContent = descMatch[1].trim();
    } else if (currentTitle && !currentContent && line.trim()) {
      currentContent = line.trim();
    }
  }

  if (currentTitle && currentContent) {
    pulses.push({
      categoryName: "",
      title: currentTitle.trim(),
      content: currentContent.trim(),
    });
  }

  return pulses;
}

function isTypeValidationError(error: unknown): boolean {
  return (
    error instanceof TypeValidationError ||
    (error as Error).name === "TypeValidationError" ||
    (error as Error).message?.includes("Type validation failed")
  );
}

/**
 * Gather trending pulses via Grok with x-search
 * Uses manual loops to ensure Grok continues exploring across all iterations
 */
export async function gatherPulsesWithGrok({
  query,
  locale,
  logger,
  abortSignal,
}: {
  query: string;
  locale: Locale;
  logger: Logger;
  abortSignal: AbortSignal;
}): Promise<RawPulse[]> {
  const allTools: ToolSet = {
    x_search: xai.tools.xSearch({
      enableImageUnderstanding: true,
      enableVideoUnderstanding: true,
    }),
  } as ToolSet;

  const systemPrompt = gatherPulsesSystem({ locale });

  const allPulses: RawPulse[] = [];
  const messages: ModelMessage[] = [{ role: "user", content: query }];

  for (let loop = 0; loop < SEARCH_LOOPS; loop++) {
    try {
      let loopText = "";

      const response = streamText({
        model: llm("grok-4-1-fast-non-reasoning"),
        system: systemPrompt,
        providerOptions: defaultProviderOptions(),
        tools: allTools,
        toolChoice: "auto",
        messages,
        abortSignal,
        onError: ({ error }: { error: unknown }) => {
          if (isTypeValidationError(error)) {
            logger.debug({
              msg: "xAI TypeValidationError ignored",
              error: (error as Error).message,
              loop: loop + 1,
            });
            return;
          }
          logger.error({
            msg: "grokPulseExpert streamText onError",
            error: (error as Error).message,
            stack: (error as Error).stack,
            loop: loop + 1,
          });
          throw error;
        },
        onFinish: ({ text }) => {
          loopText = text;
        },
      });

      await response.consumeStream();

      const loopPulses = parsePulsesFromText(loopText);
      allPulses.push(...loopPulses);

      logger.debug({
        msg: "Grok search loop completed",
        loop: loop + 1,
        pulsesFound: loopPulses.length,
        totalPulses: allPulses.length,
      });

      messages.push({ role: "assistant", content: loopText });

      if (loop < SEARCH_LOOPS - 1) {
        messages.push({
          role: "user",
          content: gatherPulsesContinuation({ locale }),
        });
      }
    } catch (error) {
      if (isTypeValidationError(error)) {
        logger.debug({
          msg: "xAI TypeValidationError in loop, continuing",
          error: (error as Error).message,
          loop: loop + 1,
        });
        continue;
      }

      logger.error({
        msg: "Failed to complete Grok search loop",
        error: (error as Error).message,
        stack: (error as Error).stack,
        loop: loop + 1,
      });
      throw error;
    }
  }

  const uniquePulses = Array.from(
    new Map(allPulses.map((p) => [p.title.toLowerCase(), p])).values(),
  );

  if (uniquePulses.length === 0) {
    logger.warn("No pulses found after all Grok search loops");
  } else {
    logger.info({
      msg: "Grok pulse gathering completed",
      totalPulses: uniquePulses.length,
      loops: SEARCH_LOOPS,
    });
  }

  return uniquePulses;
}
