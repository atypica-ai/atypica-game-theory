import "server-only";

import { llm, providerOptions } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { generateObject } from "ai";
import { Logger } from "pino";
import { z } from "zod";
import type { AnalystSelectionParams, AnalystSelectionResult } from "./types";
import { chunkArray } from "./utils";

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

  logger.info({
    msg: "Starting analyst selection",
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

    logger.info({
      msg: "Analyst selection completed successfully",
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
      logger.warn({ msg: "LLM selected invalid analyst IDs", invalidIds });
      throw new Error(`LLM selected invalid analyst IDs: ${invalidIds.join(", ")}`);
    }

    return {
      selectedAnalystIds,
      reasoning: result.object.overallReasoning,
    };
  } catch (error) {
    logger.error({
      msg: "Analyst selection failed",
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `Failed to select analysts: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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

  log.info({
    msg: "Starting batch selection",
    batchCount: batches.length,
    targetCount,
  });

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    if (allSelectedIds.length >= targetCount) {
      log.info({
        msg: "Target count reached, stopping batch processing",
        currentCount: allSelectedIds.length,
        targetCount,
      });
      break;
    }

    const remainingCount = targetCount - allSelectedIds.length;
    const batchTargetCount = Math.min(remainingCount, batch.length);

    try {
      log.info({
        msg: `Processing batch ${batchIndex + 1}/${batches.length}`,
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

      log.info({
        msg: `Batch ${batchIndex + 1} completed`,
        batchSelectedCount: batchResult.selectedAnalystIds.length,
        totalSelectedCount: allSelectedIds.length,
      });
    } catch (error) {
      log.error({
        msg: `Batch ${batchIndex + 1} selection failed`,
        error: error instanceof Error ? error.message : String(error),
        batchSize: batch.length,
      });
      // Continue with next batch on error
    }
  }

  log.info({
    msg: "Batch selection completed",
    finalSelectedCount: allSelectedIds.length,
    targetCount,
    selectedIds: allSelectedIds,
  });

  return allSelectedIds.slice(0, targetCount); // Ensure we don't exceed target
}
