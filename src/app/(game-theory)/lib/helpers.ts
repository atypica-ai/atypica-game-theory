import "server-only";

import { GameType, Horizon } from "../gameTypes/types";
import { GameTimeline } from "../types";

// ── Termination ──────────────────────────────────────────────────────────────

export function shouldTerminate(horizon: Horizon, roundId: number, timeline: GameTimeline): boolean {
  switch (horizon.type) {
    case "fixed":
      return roundId >= horizon.rounds;
    case "condition":
      return horizon.shouldTerminate(timeline);
    case "indefinite":
      return roundId >= horizon.maxRounds;
  }
}

// ── Randomization ────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Timing ───────────────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Default action (timeout fallback) ────────────────────────────────────────

/**
 * Returns a sensible default action for a game type, used when a human player
 * times out. Handles both enum-based schemas (picks first value) and numeric
 * schemas (picks midpoint of min/max range).
 */
export function getDefaultAction(gameType: GameType): Record<string, unknown> {
  const shape = (gameType.actionSchema as { shape?: Record<string, unknown> }).shape;
  if (!shape) return {};
  for (const [key, field] of Object.entries(shape)) {
    const f = field as { _def?: { values?: string[]; checks?: Array<{ kind: string; value: number }> } };
    // Enum field: pick first value
    if (f._def?.values && f._def.values.length > 0) {
      return { [key]: f._def.values[0] };
    }
    // Numeric field: pick midpoint of min/max range
    const checks = f._def?.checks ?? [];
    const minCheck = checks.find((c) => c.kind === "min");
    const maxCheck = checks.find((c) => c.kind === "max");
    if (minCheck || maxCheck) {
      const min = minCheck?.value ?? 0;
      const max = maxCheck?.value ?? 100;
      return { [key]: Math.round((min + max) / 2) };
    }
  }
  return {};
}
