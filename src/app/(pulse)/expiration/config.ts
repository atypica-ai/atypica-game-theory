import "server-only";

/**
 * Configuration constants for pulse expiration system
 * Centralized configuration for HEAT delta thresholds and limits
 */
export const EXPIRATION_CONFIG = {
  // HEAT delta threshold (percentage change between days, range: -1 to 1)
  MIN_HEAT_DELTA_THRESHOLD: -0.4, // Minimum 10% increase to stay active (0.1 = 10%)

  // Top N limit
  TOP_N_PULSES_PER_CATEGORY: 20, // Max pulses per category

  // Lookback window for yesterday's pulses
  YESTERDAY_LOOKBACK_HOURS: 24, // Consider pulses from last 24-48 hours as "yesterday"
} as const;
