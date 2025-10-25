import "server-only";

import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { podcastEvaluationSystem } from "@/app/(podcast)/prompt/evaluation";
import {
  PodcastEvaluationScores,
  PodcastKindDetermination,
  podcastEvaluationScoresSchema,
  podcastKindDeterminationSchema,
} from "@/app/(podcast)/types";
import { fetchActiveSubscription } from "@/app/account/lib";
import { rootLogger } from "@/lib/logging";
import { generateToken } from "@/lib/utils";
import type { Analyst, AnalystExtra, AnalystPodcast, AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { generatePodcast } from "./generation";
import { notifyPodcastReady } from "./notify";

const PODCAST_KIND_DETERMINATION_SYSTEM = `
You are an expert podcast producer. Your task is to determine the best podcast format for a research topic based on its content and nature.

## Available Podcast Formats

### 1. deepDive (深度探讨)
**Format**: Two hosts (Guy & Ira) presenting from a third-party perspective
**Best for**: Research that benefits from objective, comprehensive exploration
**Characteristics**:
- Complex topics requiring step-by-step breakdown and explanation
- Research with rich findings, multiple insights, and interesting process
- Content where logic, methodology, and research journey are as valuable as conclusions
- Studies where the research process itself tells a compelling story
- Topics where audience needs to understand "how we got here" not just "what to do"
- Default choice for most research content

### 2. opinionOriented (观点导向)
**Format**: Solo host (the researcher) presenting with strong conviction
**Best for**: Research with clear, actionable recommendations that require persuasion
**Characteristics**:
- Research with definitive conclusions and specific, actionable recommendations
- Topics where the researcher has a firm stance and wants to convince listeners to take action
- Content that challenges common practices, misconceptions, or conventional wisdom
- Studies where the "what to do" is significantly more valuable than the "how we know"
- Situations where listeners need clear guidance and confidence to make decisions or change behavior
- The researcher acts as an advisor, not just an information presenter

## Decision Guidelines

**Choose opinionOriented when**:
- The research has a single, clear, actionable recommendation
- The goal is to change listener behavior or convince them of a specific approach
- The researcher has strong convictions and wants to persuade
- The content is more prescriptive ("you should do X") than descriptive

**Choose deepDive when**:
- The research explores multiple aspects or reveals interesting insights
- The goal is to educate and inform rather than persuade
- The research process or methodology is interesting and valuable to share
- The content is rich with discoveries but not necessarily a single call-to-action
- When in doubt, choose deepDive as the default

## Output Requirement
You must choose either "deepDive" or "opinionOriented". Provide clear, specific reasoning for your choice based on the research content, conclusions, and the value it provides to listeners.
`;

async function determinePodcastKind(
  analyst: Pick<Analyst, "id" | "topic" | "brief" | "studySummary" | "studyLog">,
): Promise<PodcastKindDetermination> {
  const determinationPrompt = `Please determine the best podcast format for this research:

**Topic**: ${analyst.topic || "Not specified"}

**Brief**: ${analyst.brief || "No brief available"}

**Study Summary**: ${analyst.studySummary || "No summary available"}

**Study Log**: ${analyst.studyLog || "No study log available"}

Based on the research content, conclusions, and the value it provides to listeners, determine whether this should be a "deepDive" or "opinionOriented" podcast. Provide clear, specific reasoning for your choice.`;

  const result = await generateObject({
    model: llm("gpt-5-mini"),
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
        reasoningEffort: "minimal",
      } satisfies OpenAIResponsesProviderOptions,
    },
    system: PODCAST_KIND_DETERMINATION_SYSTEM,
    prompt: determinationPrompt,
    schema: podcastKindDeterminationSchema,
    schemaName: "PodcastKindDetermination",
    schemaDescription: "Determine the best podcast format for the research",
    maxRetries: 2,
  });

  rootLogger.info({
    msg: "determinePodcastKind completed",
    analystId: analyst.id,
    kind: result.object.kind,
    reason: result.object.reason,
  });

  return result.object;
}

export async function determineKindAndGeneratePodcast({
  analystId,
  instruction,
  abortSignal,
  statReport,
}: {
  analystId: number;
  instruction?: string;
  abortSignal: AbortSignal;
  statReport: StatReporter;
}): Promise<AnalystPodcast> {
  const logger = rootLogger.child({ method: "determineKindAndGeneratePodcast", analystId });

  // Fetch analyst
  const analyst = await prisma.analyst.findUniqueOrThrow({
    where: { id: analystId },
  });

  // Create podcast record
  let podcast = await prisma.analystPodcast
    .create({
      data: {
        analystId,
        token: generateToken(),
        instruction: instruction || "",
        script: "",
      },
    })
    .then(({ extra, ...analyst }) => ({
      ...analyst,
      extra: extra as AnalystPodcastExtra,
    }));

  // Step 1: Determine podcast kind
  logger.info("Determining podcast kind");
  const kindDetermination = await determinePodcastKind(analyst);
  logger.info({
    msg: "Podcast kind determined",
    kind: kindDetermination.kind,
    reason: kindDetermination.reason,
  });

  await prisma.$executeRaw`
    UPDATE "AnalystPodcast"
    SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({ kindDetermination })}::jsonb,
        "updatedAt" = NOW()
    WHERE "id" = ${podcast.id}
  `;
  podcast = await prisma.analystPodcast
    .findUniqueOrThrow({ where: { id: podcast.id } })
    .then(({ extra, ...analyst }) => ({ ...analyst, extra: extra as AnalystPodcastExtra }));

  // Step 2: Generate podcast with the determined kind (no systemPrompt for auto-determined podcasts)
  await generatePodcast({
    podcast,
    abortSignal,
    statReport,
  });
  logger.info({ msg: "Podcast generated with kind determination", podcastId: podcast.id });

  podcast = await prisma.analystPodcast
    .findUniqueOrThrow({ where: { id: podcast.id } })
    .then(({ extra, ...analyst }) => ({ ...analyst, extra: extra as AnalystPodcastExtra }));

  await notifyPodcastReady({
    analystId: analyst.id,
    podcast: { token: podcast.token },
    logger,
  });

  return podcast;
}

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

export async function evaluateAndGeneratePodcast({
  analystId,
  scoreThreshold,
  dryRun = false,
}: {
  analystId: number;
  scoreThreshold: number; // 0 ~ 1
  dryRun?: boolean;
}): Promise<void> {
  const logger = rootLogger.child({ method: "evaluateAndGeneratePodcast", analystId, dryRun });

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
    await prisma.$executeRaw`
        UPDATE "Analyst"
        SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({ podcastEvaluation: { processing: true } })}::jsonb,
            "updatedAt" = NOW()
        WHERE "id" = ${analyst.id}
      `;
  }

  // step 1: evaluate analyst for podcast
  const { scores, shouldSelect } = await evaluateAnalystForPodcast(analyst, scoreThreshold);

  if (!dryRun) {
    await prisma.$executeRaw`
        UPDATE "Analyst"
        SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({ podcastEvaluation: scores })}::jsonb,
            "updatedAt" = NOW()
        WHERE "id" = ${analyst.id}
      `;
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

  const podcast = await prisma.analystPodcast
    .create({
      data: {
        analystId,
        token: generateToken(),
        instruction: "",
        script: "",
        extra: {
          kindDetermination: {
            kind: "deepDive",
            reason: "Evaluation passed threshold",
          },
        } as AnalystPodcastExtra,
      },
    })
    .then(({ extra, ...analyst }) => ({
      ...analyst,
      extra: extra as AnalystPodcastExtra,
    }));

  // step 2: generate podcast
  await generatePodcast({
    podcast,
    abortSignal: abortController.signal,
    statReport: statReport,
  });

  logger.info({ msg: "Podcast generated after evaluation", podcastId: podcast.id });

  await notifyPodcastReady({
    analystId: analyst.id,
    podcast: { token: podcast.token },
    logger,
  });
}
