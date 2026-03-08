import "server-only";

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

export { RECOMMEND_CONFIG } from "./config";
export { recommendPulsesForActiveUsers } from "./recommendForActiveUsers";
export { recommendPulsesForUser } from "./recommendPulses";
export {
  pulseRecommendationItemSchema,
  recommendOutputSchema,
  type PulseRecommendationItem,
  type RecommendOutput,
  type RecommendPulsesResult,
} from "./types";
