"server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { xai } from "@ai-sdk/xai";
import { streamText, ToolSet, TypeValidationError, CoreMessage } from "ai";
import { Pulse } from "../types";
import { Logger } from "pino";
import { promptSystemConfig } from "@/ai/prompt/systemConfig";

const SEARCH_LOOPS = 2;
const MAX_PULSES_PER_LOOP = 6;
/**
 * Parse pulses from text output
 * Format: "Title: [title]\nDescription: [description]"
 */
function parsePulsesFromText(text: string): Pulse[] {
  const pulses: Pulse[] = [];
  if (!text) return pulses;

  const lines = text.split("\n");
  let currentTitle: string | null = null;
  let currentContent: string | null = null;

  for (const line of lines) {
    const cleanLine = line.replace(/^\*+|\*+$/g, ""); // strip away **
    const titleMatch = cleanLine.match(/^Title:\s*(.+)$/i);
    const descMatch = cleanLine.match(/^Description:\s*(.+)$/i);

    if (titleMatch) {
      // Save previous pulse if exists
      if (currentTitle && currentContent) {
        pulses.push({
          categoryName: "", // Will be set by caller
          title: currentTitle.trim(),
          content: currentContent.trim(),
        });
      }
      currentTitle = titleMatch[1].trim();
      currentContent = null;
    } else if (descMatch && currentTitle) {
      currentContent = descMatch[1].trim();
    } else if (currentTitle && !currentContent && line.trim()) {
      // Handle case where description might be on next line without "Description:" prefix
      currentContent = line.trim();
    }
  }

  // Don't forget the last pulse
  if (currentTitle && currentContent) {
    pulses.push({
      categoryName: "", // Will be set by caller
      title: currentTitle.trim(),
      content: currentContent.trim(),
    });
  }

  return pulses;
}

/**
 * Check if error is TypeValidationError (non-fatal for xAI)
 */
function isTypeValidationError(error: unknown): boolean {
  return (
    error instanceof TypeValidationError ||
    (error as Error).name === "TypeValidationError" ||
    (error as Error).message?.includes("Type validation failed")
  );
}

/**
 * Simplified Grok expert for pulse gathering
 * Uses manual loops to ensure Grok continues exploring across all iterations
 * Each loop accumulates messages so Grok knows what it has already collected
 */
export async function gatherPulsesWithGrok(
  query: string,
  logger: Logger,
  abortSignal: AbortSignal,
): Promise<Pulse[]> {
  const allTools: ToolSet = {
    x_search: xai.tools.xSearch({
      enableImageUnderstanding: true,
      enableVideoUnderstanding: true,
    }),
  } as ToolSet;

  const systemPrompt = `
# Role
You are a trending topic discovery expert specializing in finding trending topics and insights on X (Twitter).

# Task
Find (<= ${MAX_PULSES_PER_LOOP}) the MOST trending (at least 10k views) topics based on the user's query within the last 7 days. Use x_search only.
Each topic should have:
- A clear, concise title
- A brief description of the topic

# Notice
- Quality over quantity. 
- Ignore Compilation and Roundup post, they post biased and late news sometimes.
- Search time range is posts created in the last 7 days unless specified otherwise. Anything earlier is ignored.
- Explore different angles and use varied search terms to cover all trending topics that meet the requirements.
- Record your findings in the specified format.

# Title Format Requirements
Titles must include 
1. unique names (products/tools/concepts) for accurately grouping posts of the same topic with 1 word at best and 3 words at worst 
+ 
2. brief context if first part needs supplementary information for readers to understand. 
Entire Title Keep under 8 words.

Good: "CGFlow and ActivityDiff: drug discovery AI", "1T-TaS₂: quantum material switching", "Pony Alpha: mysterious new LLM"
Bad: "AI Drug Design Tools"(too general), "Quantum Material Switching", "New LLM Model"

# Output Format
Output your findings directly in your message. FORBID usage of markdown format, it breaks my parsing. Format each topic as:
Title: [topic title]
Description: [brief description]
${promptSystemConfig({ locale: "en-US" })}
`;

  const allPulses: Pulse[] = [];
  const messages: CoreMessage[] = [{ role: "user", content: query }];

  // Loop SEARCH_LOOPS times, accumulating all messages so each loop sees everything
  for (let loop = 0; loop < SEARCH_LOOPS; loop++) {
    try {
      const response = await streamText({
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
            return; // Don't throw - let stream continue
          }
          logger.error({
            msg: "grokPulseExpert streamText onError",
            error: (error as Error).message,
            stack: (error as Error).stack,
            loop: loop + 1,
          });
          throw error;
        },
      });

      // Consume stream and get text output
      const text = await response.text;

      // Parse pulses from this loop's output
      const loopPulses = parsePulsesFromText(text);
      allPulses.push(...loopPulses);

      logger.debug({
        msg: "Grok search loop completed",
        loop: loop + 1,
        pulsesFound: loopPulses.length,
        totalPulses: allPulses.length,
      });

      // Add assistant response to messages
      messages.push({
        role: "assistant",
        content: text,
      });

      // Add continuation message for next loop (except after last loop)
      if (loop < SEARCH_LOOPS - 1) {
        messages.push({
          role: "user",
          content: "Continue exploring different angles and search terms for more trending topics that meet the requirements. Finally, record new findings without duplicating in specified format (without extra md format like **)",
        });
      }
    } catch (error) {
      if (isTypeValidationError(error)) {
        logger.debug({
          msg: "xAI TypeValidationError in loop, continuing",
          error: (error as Error).message,
          loop: loop + 1,
        });
        continue; // Skip this loop but continue to next
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

  // Deduplicate pulses by title (case-insensitive)
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

