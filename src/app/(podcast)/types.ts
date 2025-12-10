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

// Podcast kind enum - centralized definition
export enum PodcastKind {
  deepDive = "deepDive",
  opinionOriented = "opinionOriented",
  fastInsight = "fastInsight",
  debate = "debate", // May be used in the future
}

// LLM determination schema - includes all kinds except fastInsight (which is determined by analyst.kind)
// fastInsight is excluded because it's determined by analyst.kind, not by LLM
// Using enum values ensures type safety and maintainability
export const podcastKindDeterminationSchema = z.object({
  kind: z.enum([PodcastKind.deepDive, PodcastKind.opinionOriented] as const),
  reason: z.string(),
});

export type PodcastKindDetermination = z.infer<typeof podcastKindDeterminationSchema>;
