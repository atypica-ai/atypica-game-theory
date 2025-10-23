import { AnalystPodcastExtra } from "@/prisma/client";
import { z } from "zod/v3";

const podcastEvaluationScoreSchema = z.object({
  score: z.number().min(0).max(4),
  reason: z.string(),
});

export const podcastEvaluationScoresSchema = z.object({
  topicRelevanceNews: podcastEvaluationScoreSchema,
  topicRelevanceAudience: podcastEvaluationScoreSchema,
  surpriseContradiction: podcastEvaluationScoreSchema,
  surpriseApproach: podcastEvaluationScoreSchema,
  qualityLogic: podcastEvaluationScoreSchema,
  qualityEvidence: podcastEvaluationScoreSchema,
  insightDifficulty: podcastEvaluationScoreSchema,
  insightPractical: podcastEvaluationScoreSchema,
});

export type PodcastEvaluationScores = z.infer<typeof podcastEvaluationScoresSchema>;

// LLM determination schema - only 2 kinds for now
export const podcastKindDeterminationSchema = z.object({
  kind: z.enum(["deepDive", "opinionOriented"]),
  reason: z.string(),
});

export type PodcastKindDetermination = z.infer<typeof podcastKindDeterminationSchema>;

// Full podcast kind type - includes all 3 kinds (debate may be used in the future)
export type PodcastKind = NonNullable<AnalystPodcastExtra["kindDetermination"]>["kind"]; // "deepDive" | "opinionOriented" | "debate";
