"server-only";

/**
 * Configuration constants for HEAT calculation pipeline
 * Centralized configuration for weights, thresholds, and limits
 */
export const HEAT_CONFIG = {
  GOALPOSTS: {
    VIEWS_MIN: 0,
    VIEWS_MAX: 5_000_000,
    ENGAGEMENT_MIN: 0,
    ENGAGEMENT_MAX: 0.15,    // 15%
  },
  // Engagement intensity weights (used in engagement rate calculation)
  ENGAGEMENT_WEIGHTS: {
    likes: 0.5, // Likes is a very weak indicator of engagement
    retweets: 3.0,
    replies: 5.0,
  },
  TOP_K: 3, // Number of top posts to average
  // Score multiplier for human-friendly scores (0-10,000 range)
  REACH_WEIGHT: 0.6,
  INTENSITY_WEIGHT: 0.4,

  SCORE_MULTIPLIER: 1000,

  // Post gathering
  POSTS_PER_PULSE: 10, // Number of posts to gather per pulse

  // Fake engagement detection thresholds
  MAX_ENGAGEMENT_RATE: 0.15, // 15% cap (anything above is suspicious)
  MAX_RETWEET_RATE: 0.1, // 10% retweet rate
  MAX_REPLY_RATE: 0.05, // 5% reply rate
  MIN_VIEWS_FOR_HIGH_ENGAGEMENT: 5000, // Small posts with high engagement are suspicious

  // Identity fixing
  IDENTITY_MATCH_THRESHOLD: 0.8, // Semantic similarity threshold for matching

  // Today's pulse check window (hours)
  TODAY_PULSE_WINDOW_HOURS: 24, // Consider pulses from last 24 hours as "today's pulses"

  // Parallel processing
  MAX_WORKERS: 10, // Maximum concurrent pulse processing
} as const;


