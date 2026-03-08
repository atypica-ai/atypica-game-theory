import "server-only";

import { z } from "zod";

/**
 * Individual pulse recommendation with angle
 */
export const pulseRecommendationItemSchema = z.object({
  pulseId: z.number(),
  angle: z
    .string()
    .describe(
      "explain to a third person on why you recommend this topic to the user with an attractive, interesting, or valuable angle (20-200 characters)",
    ),
});

/**
 * Output schema for pulse recommendation agent
 */
export const recommendOutputSchema = z.object({
  reasoning: z.string(), // Brief explanation for debugging
  recommendations: z.array(pulseRecommendationItemSchema).max(10),
});

export type RecommendOutput = z.infer<typeof recommendOutputSchema>;
export type PulseRecommendationItem = z.infer<typeof pulseRecommendationItemSchema>;

/**
 * Result type for recommendPulsesForUser function
 */
export interface RecommendPulsesResult {
  success: boolean;
  pulseCount: number;
  pulseIds: number[];
  recommendations: Array<{ pulseId: number; angle: string }>;
}
