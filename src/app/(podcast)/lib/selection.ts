import "server-only";

import { llm, providerOptions } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { Analyst } from "@/prisma/client";
import { generateObject } from "ai";
import { Logger } from "pino";
import { z } from "zod";
import { chunkArray } from "./utils";
import { podcastEvaluationSystem } from "@/app/(podcast)/prompt";
/**
 * Selects the most interesting analysts from a given array using LLM with structured output.
 * Uses generateObject to ensure consistent, structured results.
 */
export async function selectTopAnalysts(
  analysts: Analyst[],
  topN: number = 1,
  systemPrompt?: string,
  logger?: Logger,
): Promise<{
  selectedAnalystIds: number[];
  reasoning?: string;
}> {
  const log = logger || rootLogger.child({
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
    log.warn("topN is greater than available analysts, selecting all analysts");
  }

  const effectiveTopN = Math.min(topN, analysts.length);

  log.info({
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

    log.info({
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
      log.warn({ msg: "LLM selected invalid analyst IDs", invalidIds });
      throw new Error(`LLM selected invalid analyst IDs: ${invalidIds.join(", ")}`);
    }

    return {
      selectedAnalystIds,
      reasoning: result.object.overallReasoning,
    };
  } catch (error) {
    log.error({
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

      const batchResult = await selectTopAnalysts(
        batch,
        batchTargetCount,
        undefined,
        log,
      );

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

/**
 * Evaluates a single analyst using a detailed rubric scoring system.
 * Scores 8 criteria (0-4 points each) and makes selection based on total score threshold.
 */
export async function evaluateAnalystForPodcast(
  analyst: Analyst,
  scoreThreshold: number = 20, // Out of 32 total points (62.5%)
  systemPrompt?: string,
  logger?: Logger,
): Promise<{
  shouldSelect: boolean;
  totalScore: number;
  overallReason: string;
}> {
  const log = logger || rootLogger.child({
    method: "evaluateAnalystForPodcast",
    analystId: analyst.id,
    topic: analyst.topic,
  });

  // Validate input
  if (!analyst) {
    throw new Error("No analyst provided for evaluation");
  }

  if (scoreThreshold < 0 || scoreThreshold > 32) {
    throw new Error("Score threshold must be between 0 and 32");
  }

  log.info({
    msg: "Starting analyst evaluation with rubric scoring",
    analystId: analyst.id,
    topic: analyst.topic || "Not specified",
    threshold: scoreThreshold,
  });

  // Create the evaluation prompt with analyst details
  const evaluationPrompt = `Please evaluate this research using the rubric scoring system:

**Topic**: ${analyst.topic || "Not specified"}

**Brief**: ${analyst.brief || "No brief available"}

**Study Summary**: ${analyst.studySummary || "No summary available"}

**Study Log**: ${analyst.studyLog || "No study log available"}

Score each of the 8 criteria according to the rubric (0-4 points each). Provide specific reasoning for each score based on the content provided.`;

  // Define the schema for structured output with detailed scoring
  const evaluationSchema = z.object({
    scores: z.object({
      topicRelevanceNews: z.object({
        score: z.number().min(0).max(4).describe("Score for news/controversy relevance (0 or 4 points)"),
        reason: z.string().describe("Explanation for this score"),
      }),
      topicRelevanceAudience: z.object({
        score: z.number().min(0).max(4).describe("Score for audience size/care level (0-4 points)"),
        reason: z.string().describe("Explanation for this score"),
      }),
      surpriseContradiction: z.object({
        score: z.number().min(0).max(4).describe("Score for contradicting common beliefs (0-4 points)"),
        reason: z.string().describe("Explanation for this score"),
      }),
      surpriseApproach: z.object({
        score: z.number().min(0).max(4).describe("Score for unusual research approach (0-4 points)"),
        reason: z.string().describe("Explanation for this score"),
      }),
      qualityLogic: z.object({
        score: z.number().min(0).max(4).describe("Score for logical soundness (0-4 points)"),
        reason: z.string().describe("Explanation for this score"),
      }),
      qualityEvidence: z.object({
        score: z.number().min(0).max(4).describe("Score for evidence reliability (0-4 points)"),
        reason: z.string().describe("Explanation for this score"),
      }),
      insightDifficulty: z.object({
        score: z.number().min(0).max(4).describe("Score for research difficulty/expertise needed (0-4 points)"),
        reason: z.string().describe("Explanation for this score"),
      }),
      insightPractical: z.object({
        score: z.number().min(0).max(4).describe("Score for practical application value (0-4 points)"),
        reason: z.string().describe("Explanation for this score"),
      }),
    }),
    overallReason: z.string().describe("Summary of why this research should or shouldn't be selected based on total score"),
  });

  try {
    const result = await generateObject({
      model: llm("gpt-4.1-nano"),
      providerOptions: providerOptions,
      system: podcastEvaluationSystem,
      prompt: evaluationPrompt,
      schema: evaluationSchema,
      schemaName: "PodcastEvaluation",
      schemaDescription: "Detailed rubric-based evaluation for podcast suitability",
      maxRetries: 2,
    });

    const scores = result.object.scores;
    
    // Calculate total score
    const totalScore = 
      scores.topicRelevanceNews.score +
      scores.topicRelevanceAudience.score +
      scores.surpriseContradiction.score +
      scores.surpriseApproach.score +
      scores.qualityLogic.score +
      scores.qualityEvidence.score +
      scores.insightDifficulty.score +
      scores.insightPractical.score;

    const maxScore = 32;
    const shouldSelect = totalScore >= scoreThreshold;

    log.info({
      msg: "Analyst rubric evaluation completed",
      analystId: analyst.id,
      totalScore,
      maxScore,
      threshold: scoreThreshold,
      shouldSelect,
      scoreBreakdown: Object.fromEntries(
        Object.entries(scores).map(([key, value]) => [key, value.score])
      ),
    });

    return {
      shouldSelect,
      totalScore,
      overallReason: `Score: ${totalScore}/${maxScore} (threshold: ${scoreThreshold}). ${result.object.overallReason}`,
    };
  } catch (error) {
    log.error({
      msg: "Analyst rubric evaluation failed",
      analystId: analyst.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      `Failed to evaluate analyst ${analyst.id}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}