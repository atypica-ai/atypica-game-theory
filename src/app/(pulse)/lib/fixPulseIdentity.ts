"server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { generateText, tool, ToolSet } from "ai";
import { z } from "zod";
import { Logger } from "pino";
import { prisma } from "@/prisma/prisma";

/**
 * Match result from identity fixing agent
 */
const matchSchema = z.object({
  reason: z.string().describe("Why these pulses match (same topic/identity)"),
  newPulseId: z.number().describe("ID of the new pulse"),
  oldPulseId: z.number().describe("ID of the old pulse (yesterday's version)"),
});

const matchesOutputSchema = z.object({
  matches: z.array(matchSchema).describe("Array of pulse pairs that match"),
});

/**
 * Match pair result
 */
export interface PulseMatchPair {
  newPulseId: number;
  oldPulseId: number;
  oldTitle: string;
  reason: string;
}

/**
 * Match today's pulses with yesterday's pulses to identify which are the same topic
 * Returns ONLY the match pairs - does NOT update anything in database
 * 
 * @param newPulses - Today's newly gathered pulses (simple objects with id, title, content)
 * @param categoryId - Category ID to match within
 * @param logger - Logger instance
 * @returns Array of match pairs (newPulseId, oldPulseId, oldTitle)
 */
export async function matchPulseIdentities(
  newPulses: Array<{ id: number; title: string; content: string }>,
  categoryId: number,
  logger: Logger,
): Promise<PulseMatchPair[]> {
  const categoryLogger = logger.child({ categoryId, newPulseCount: newPulses.length });

  if (newPulses.length === 0) {
    categoryLogger.debug("No new pulses to match");
    return [];
  }

  // Query yesterday's pulses for same category
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const yesterdayPulses = await prisma.pulse.findMany({
    where: {
      categoryId,
      expired: false,
      createdAt: {
        gte: yesterdayStart,
        lt: todayStart,
      },
    },
    select: {
      id: true,
      title: true,
      content: true,
    },
  });

  if (yesterdayPulses.length === 0) {
    categoryLogger.debug("No yesterday's pulses found");
    return [];
  }

  categoryLogger.info({
    yesterdayCount: yesterdayPulses.length,
    msg: "Matching pulse identities",
  });

  // Use LLM to match pulses
  const systemPrompt = `You are a pulse identity matching expert. Identify which of today's new pulses are the same topic as yesterday's pulses.

Return only confident matches. Provide reasoning for each match.`;

  const userPrompt = `Today's pulses:\n"""\n
${newPulses.map((p) => `ID: ${p.id}\nTitle: ${p.title}\nContent: ${p.content.substring(0, 200)}...`).join("\n\n")}\n"""

Yesterday's pulses:\n"""\n
${yesterdayPulses.map((p) => `ID: ${p.id}\nTitle: ${p.title}\nContent: ${p.content.substring(0, 200)}...`).join("\n\n")}\n"""

Identify matches and call the outputMatches tool.`;
  const outputMatchesTool = tool({
    description: "Output pulse identity matches",
    inputSchema: matchesOutputSchema,
    execute: async () => ({ success: true }),
  });

  try {
    const result = await generateText({
      model: llm("claude-sonnet-4-5"),
      system: systemPrompt,
      prompt: userPrompt,
      tools: { outputMatches: outputMatchesTool } as ToolSet,
      toolChoice: "required",
      providerOptions: defaultProviderOptions(),
    });

    const toolCall = result.steps
      .flatMap((step) => step.toolCalls || [])
      .find((call) => call.toolName === "outputMatches");

    if (!toolCall) {
      categoryLogger.warn("No matches returned from LLM");
      return [];
    }

    const { matches } = toolCall.input as z.infer<typeof matchesOutputSchema>;

    if (matches.length === 0) {
      categoryLogger.info("No pulse identity matches found");
      return [];
    }

    // Fetch old titles
    const oldPulseIds = matches.map((m) => m.oldPulseId);
    const oldPulses = await prisma.pulse.findMany({
      where: { id: { in: oldPulseIds } },
      select: { id: true, title: true },
    });
    const oldTitleMap = new Map(oldPulses.map((p) => [p.id, p.title]));

    // Build match pairs with titles
    const matchPairs: PulseMatchPair[] = matches
      .map((match) => {
        const oldTitle = oldTitleMap.get(match.oldPulseId);
        if (!oldTitle) {
          categoryLogger.warn({ oldPulseId: match.oldPulseId, msg: "Old pulse not found" });
          return null;
        }
        return {
          newPulseId: match.newPulseId,
          oldPulseId: match.oldPulseId,
          oldTitle,
          reason: match.reason,
        };
      })
      .filter((pair): pair is PulseMatchPair => pair !== null);

    categoryLogger.info({
      matchCount: matchPairs.length,
      msg: "Pulse identity matching completed",
    });

    return matchPairs;
  } catch (error) {
    categoryLogger.error({
      msg: "Failed to match pulse identities",
      error: (error as Error).message,
    });
    return [];
  }
}

