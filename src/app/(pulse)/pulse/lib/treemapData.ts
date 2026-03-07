"use client";

interface Pulse {
  id: number;
  title: string;
  category: { name: string };
  heatScore: number | null;
  heatDelta: number | null;
  createdAt: Date;
}

export interface TreemapNode {
  name: string;
  value?: number;
  data?: Pulse;
  children?: TreemapNode[];
}

/**
 * Size contrast controls (user-adjustable)
 * Increase exponent to make big tiles much bigger than small tiles.
 * Increase bias to lift smaller tiles before exponent transform.
 */
export const HEAT_SIZE_CONTRAST_EXPONENT = 1.35;
export const HEAT_SIZE_CONTRAST_BIAS = 18;

/**
 * Group pulses by category name
 */
export function groupPulsesByCategory(pulses: Pulse[]): Map<string, Pulse[]> {
  const groups = new Map<string, Pulse[]>();
  for (const pulse of pulses) {
    const category = pulse.category.name;
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(pulse);
  }
  return groups;
}

/**
 * Select top N pulses per category for overview stage
 */
export function selectTopPulsesPerCategory(
  groups: Map<string, Pulse[]>,
  topN: number = 5,
): Pulse[] {
  const result: Pulse[] = [];
  for (const [, pulses] of groups) {
    const sorted = [...pulses]
      .filter((p) => p.heatScore !== null && p.heatScore > 0)
      .sort((a, b) => (b.heatScore ?? 0) - (a.heatScore ?? 0));
    result.push(...sorted.slice(0, topN));
  }
  return result;
}

function transformHeatScoreForTreemap(heatScore: number): number {
  if (heatScore <= 0) return 0;
  return Math.pow(heatScore + HEAT_SIZE_CONTRAST_BIAS, HEAT_SIZE_CONTRAST_EXPONENT);
}

/**
 * Convert flat pulses array to D3 hierarchy structure
 * Stage 1 (overview): Groups by category, shows top N per category
 * Stage 2 (detail): Shows all pulses in selected category
 */
export function createTreemapHierarchy(
  pulses: Pulse[],
  selectedCategory?: string | null,
): TreemapNode {
  const groups = groupPulsesByCategory(pulses);

  if (selectedCategory) {
    const categoryPulses = groups.get(selectedCategory) || [];
    const validPulses = categoryPulses.filter((p) => p.heatScore !== null && p.heatScore > 0);

    return {
      name: "root",
      children: validPulses.map((p) => ({
        name: p.title,
        value: transformHeatScoreForTreemap(p.heatScore ?? 0),
        data: p,
      })),
    };
  }

  const topPulses = selectTopPulsesPerCategory(groups, 5);
  const topGroups = groupPulsesByCategory(topPulses);

  return {
    name: "root",
    children: Array.from(topGroups.entries()).map(([category, groupPulses]) => ({
      name: category,
      children: groupPulses.map((p) => ({
        name: p.title,
        value: transformHeatScoreForTreemap(p.heatScore ?? 0),
        data: p,
      })),
    })),
  };
}

/**
 * Extract short title from pulse title
 * 1) split by ":" and take first part
 * 2) truncate to at most 3 words
 */
export function getShortTitle(title: string): string {
  const head = title.split(":")[0]?.trim() ?? title.trim();
  const words = head.split(/\s+/).filter((w) => w.length > 0);
  return words.slice(0, 3).join(" ");
}
