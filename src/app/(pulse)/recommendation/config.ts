"server-only";

/**
 * Configuration constants for pulse recommendation system
 * All time windows and limits are centralized here for easy adjustment
 */
export const RECOMMEND_CONFIG = {
  // User activity window
  USER_ACTIVE_DAYS: 30, // Users who logged in within last N days

  // Pulse freshness window
  PULSE_FRESH_HOURS: 24, // Pulses created within last N hours

  // Recommendation limits
  MAX_RECOMMENDED_PULSES: 10, // Maximum pulses to recommend per user
  MAX_PULSES_TO_FILTER: 30, // Maximum pulses to fetch for filtering (LLM input limit)

  // Parallel processing
  MAX_WORKERS: 10, // Maximum concurrent user processing
} as const;

