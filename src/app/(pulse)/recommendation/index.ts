"server-only";

/**
 * Pulse Recommendation System
 *
 * This module provides user-memory-based, LLM-powered pulse filtering
 * to proactively surface relevant trending content when users open atypica.
 *
 * Main exports:
 * - recommendPulsesForUser: Generate personalized pulse recommendations for a user
 * - RECOMMEND_CONFIG: Configuration constants for time windows and limits
 */

export { recommendPulsesForUser } from "./recommendPulses";
export { recommendPulsesForActiveUsers } from "./recommendForActiveUsers";
export { RECOMMEND_CONFIG } from "./config";
export {
  recommendOutputSchema,
  pulseRecommendationItemSchema,
  type RecommendOutput,
  type RecommendPulsesResult,
  type PulseRecommendationItem,
} from "./types";

