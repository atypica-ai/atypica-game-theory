import "server-only";

import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { podcastEvaluationSystem } from "@/app/(podcast)/prompt";
import { PodcastEvaluationScores, podcastEvaluationScoresSchema } from "@/app/(podcast)/types";
import { fetchActiveSubscription } from "@/app/account/lib";
import { rootLogger } from "@/lib/logging";
import type { Analyst, AnalystExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { generatePodcast } from "./generation";
import { notifyPodcastReady } from "./notify";

async function evaluateAnalystForPodcast(
  analyst: Pick<Analyst, "id" | "topic" | "brief" | "studySummary" | "studyLog">,
  scoreThreshold: number,
): Promise<{
  scores: PodcastEvaluationScores;
  shouldSelect: boolean;
}> {
  if (!analyst) {
    throw new Error("No analyst provided for evaluation");
  }

  if (scoreThreshold < 0 || scoreThreshold > 1) {
    throw new Error("Score threshold must be between 0 and 1");
  }

  const evaluationPrompt = `Please evaluate this research using the rubric scoring system:

**Topic**: ${analyst.topic || "Not specified"}

**Brief**: ${analyst.brief || "No brief available"}

**Study Summary**: ${analyst.studySummary || "No summary available"}

**Study Log**: ${analyst.studyLog || "No study log available"}

Score each of the 8 criteria according to the rubric (0-4 points each). Provide specific reasoning for each score based on the content provided.`;

  const result = await generateObject({
    model: llm("gpt-5-mini"),
    providerOptions: {
      openai: {
        // ...defaultProviderOptions.openai,
        reasoningSummary: "auto",
        reasoningEffort: "minimal",
      } satisfies OpenAIResponsesProviderOptions,
    },
    system: podcastEvaluationSystem,
    prompt: evaluationPrompt,
    schema: podcastEvaluationScoresSchema,
    schemaName: "PodcastEvaluation",
    schemaDescription: "Detailed rubric-based evaluation for podcast suitability",
    maxRetries: 2,
  });

  const scores = result.object;
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
  const thresholdScore = maxScore * scoreThreshold;
  const shouldSelect = totalScore > thresholdScore;

  rootLogger.info({
    msg: "evaluateAnalystForPodcast generateObject completed",
    analystId: analyst.id,
    totalScore,
    thresholdScore,
  });

  return { scores, shouldSelect };
}

export async function evaluateAndGenerate({
  analystId,
  scoreThreshold,
  dryRun = false,
}: {
  analystId: number;
  scoreThreshold: number; // 0 ~ 1
  dryRun?: boolean;
}): Promise<void> {
  const logger = rootLogger.child({ method: "evaluateAndGenerate", analystId, dryRun });

  try {
    const analyst = await prisma.analyst
      .findUniqueOrThrow({ where: { id: analystId } })
      .then(({ extra, ...analyst }) => ({ ...analyst, extra: extra as AnalystExtra }));

    // step 0: check if user has active subscription, podcast 功能还处于 preview 状态，暂时只给付费用户使用
    const { activeSubscription } = await fetchActiveSubscription({
      userId: analyst.userId,
    });
    if (!activeSubscription) {
      logger.info("User does not have active subscription, skipping podcast generation");
      return;
    }

    if (!dryRun) {
      await prisma.analyst.update({
        where: { id: analyst.id },
        data: { extra: { ...analyst.extra, podcastEvaluation: { processing: true } } },
      });
    }

    // step 1: evaluate analyst for podcast
    const { scores, shouldSelect } = await evaluateAnalystForPodcast(analyst, scoreThreshold);

    if (!dryRun) {
      await prisma.analyst.update({
        where: { id: analyst.id },
        data: { extra: { ...analyst.extra, podcastEvaluation: scores } },
      });
    }

    if (!shouldSelect) {
      logger.info("Analyst evaluateAnalystForPodcast below threshold, not generating podcast");
      return;
    }

    logger.info("Analyst evaluateAnalystForPodcast passed threshold, generating podcast");

    if (dryRun) {
      // Dry run enabled, skipping podcast generation
      return;
    }

    const statReport: StatReporter = async (dimension, value, extra) => {
      logger.info({
        msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
        extra,
      });
    };
    const abortController = new AbortController();

    // step 2: generate podcast
    const podcast = await generatePodcast({
      analystId: analyst.id,
      abortSignal: abortController.signal,
      statReport: statReport,
    });

    logger.info({ msg: "Podcast generated after evaluation", podcastId: podcast.id });

    await notifyPodcastReady({
      analystId: analyst.id,
      podcast: { token: podcast.token },
      logger,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ msg: "evaluateAndGenerate failed", error: errorMessage });
  }
}
