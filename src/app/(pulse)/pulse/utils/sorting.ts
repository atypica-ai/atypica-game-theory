/**
 * Shared sorting utilities for pulse data
 */

type PulseWithHeatDelta = {
  heatDelta: number | null;
  createdAt: Date;
};

/**
 * Sort pulses by heatDelta with three-tier ordering:
 * 1. Positive delta (heatDelta > 0) - sorted descending by delta, then createdAt
 * 2. New pulses (heatDelta === null) - sorted by createdAt descending
 * 3. Zero or negative delta (heatDelta <= 0) - sorted descending by delta, then createdAt
 */
export function sortPulsesByHeatDelta<T extends PulseWithHeatDelta>(a: T, b: T): number {
  const deltaA = a.heatDelta;
  const deltaB = b.heatDelta;

  // Tier 1: Positive delta (heatDelta > 0)
  const isPositiveA = deltaA !== null && deltaA > 0;
  const isPositiveB = deltaB !== null && deltaB > 0;
  if (isPositiveA && !isPositiveB) return -1; // A is positive, B is not -> A first
  if (!isPositiveA && isPositiveB) return 1; // B is positive, A is not -> B first
  if (isPositiveA && isPositiveB) {
    // Both positive: sort by delta descending, then by createdAt descending
    if (deltaA !== deltaB) return deltaB! - deltaA!;
    return b.createdAt.getTime() - a.createdAt.getTime();
  }

  // Tier 2: New pulses (heatDelta === null)
  const isNewA = deltaA === null;
  const isNewB = deltaB === null;
  if (isNewA && !isNewB) return -1; // A is new, B is not -> A first
  if (!isNewA && isNewB) return 1; // B is new, A is not -> B first
  if (isNewA && isNewB) {
    // Both new: sort by createdAt descending
    return b.createdAt.getTime() - a.createdAt.getTime();
  }

  // Tier 3: Zero or negative delta (heatDelta <= 0)
  // Sort by delta descending (0 before negative), then by createdAt descending
  const valueA = deltaA ?? 0;
  const valueB = deltaB ?? 0;
  if (valueA !== valueB) return valueB - valueA;
  return b.createdAt.getTime() - a.createdAt.getTime();
}

/**
 * Sort pulses by heatDelta (simplified version without createdAt fallback)
 * Used for recommendations where we don't need createdAt sorting
 */
export function sortPulsesByHeatDeltaSimple<T extends { heatDelta: number | null }>(
  a: T,
  b: T,
): number {
  const deltaA = a.heatDelta;
  const deltaB = b.heatDelta;

  // Tier 1: Positive delta (heatDelta > 0)
  const isPositiveA = deltaA !== null && deltaA > 0;
  const isPositiveB = deltaB !== null && deltaB > 0;
  if (isPositiveA && !isPositiveB) return -1;
  if (!isPositiveA && isPositiveB) return 1;
  if (isPositiveA && isPositiveB) {
    return deltaB! - deltaA!;
  }

  // Tier 2: New pulses (heatDelta === null)
  const isNewA = deltaA === null;
  const isNewB = deltaB === null;
  if (isNewA && !isNewB) return -1;
  if (!isNewA && isNewB) return 1;

  // Tier 3: Zero or negative delta (heatDelta <= 0)
  const valueA = deltaA ?? 0;
  const valueB = deltaB ?? 0;
  return valueB - valueA;
}

