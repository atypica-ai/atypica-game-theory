import z from "zod/v3";
import type { LLMModelName } from "@/ai/provider";
import type { GameTimeline, GameSessionExtra } from "../../types";

// ── Universal stats data schema ─────────────────────────────────────────────

/** Format hint for rendering numeric values */
export type ValueFormat = "percent" | "integer" | "decimal";

/** A column definition — describes one measurable dimension */
export interface StatsColumn {
  key: string;
  label: string;
  format?: ValueFormat;
}

/** A single row of data */
export interface StatsRow {
  label: string;
  values: Record<string, number>;
  meta?: Record<string, unknown>;
}

/** The universal data shape stored in GameStats.data */
export interface StatsData {
  columns: StatsColumn[];
  rows: StatsRow[];
}

/** Zod schema for validating StatsData before writing to DB */
export const statsDataSchema = z.object({
  columns: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      format: z.enum(["percent", "integer", "decimal"]).optional(),
    }),
  ),
  rows: z.array(
    z.object({
      label: z.string(),
      values: z.record(z.string(), z.number()),
      meta: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
});

// ── Parsed session type for stat computations ───────────────────────────────

export interface ParsedSession {
  token: string;
  gameType: string;
  personaIds: number[];
  timeline: GameTimeline;
  extra: GameSessionExtra;
}

/** Per-persona win/game tally */
export interface WinRecord {
  wins: number;
  games: number;
}

/** Persona metadata for leaderboard/tag stats */
export interface PersonaMeta {
  id: number;
  name: string;
  tags: string[];
  model?: LLMModelName;
}
