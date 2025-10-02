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
