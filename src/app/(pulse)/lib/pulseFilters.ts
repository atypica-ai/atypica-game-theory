"server-only";

/**
 * Get filter condition for non-expired pulses
 * Returns pulses where expired = false (replaces expireAt logic)
 */
export function getNonExpiredPulseFilter() {
  return {
    expired: false, // Only pulses that haven't expired yet
  };
}

/**
 * Get filter condition for pulses with HEAT scores
 * Returns pulses where heatScore is not null
 */
export function getPulsesWithHeatScore() {
  return {
    heatScore: { not: null },
  };
}

/**
 * Get filter condition for top N pulses by HEAT score
 * Note: This returns a filter, but sorting/limiting should be done in the query
 *
 * @param limit - Maximum number of pulses to return (use with orderBy and take)
 */
export function getTopPulsesByHeatFilter() {
  return {
    ...getNonExpiredPulseFilter(),
    ...getPulsesWithHeatScore(),
  };
}

