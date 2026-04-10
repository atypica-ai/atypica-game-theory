import z from "zod/v3";
import { GameTimeline } from "../types";

// Horizon / termination condition — part of the game's mathematical definition
export type Horizon =
  | { type: "fixed"; rounds: number }
  | {
      type: "condition";
      description: string; // natural language description shown to players
      shouldTerminate: (timeline: GameTimeline) => boolean;
    }
  | {
      type: "indefinite";
      discountFactor: number; // e.g. 0.9 — δ-discounted payoffs
      maxRounds: number; // safety cap
    };

// ── Human input configuration ────────────────────────────────────────────────

export type HumanInputFieldVariant = "positive" | "negative" | "warning" | "neutral";

export type HumanInputField =
  | {
      type: "enum";
      key: string;
      label?: string; // group label for multi-enum (e.g., "Classic Scenario")
      options: {
        value: string;
        label: string;
        hint: string;
        variant?: HumanInputFieldVariant; // default "neutral"
      }[];
    }
  | {
      type: "number";
      key: string;
      label: string;
      min: number;
      max: number;
      step?: number; // default 1
      hint?: string;
    };

export interface HumanInputConfig {
  fields: HumanInputField[];
  defaultAction: Record<string, unknown>;
  /** Cross-field validation — return error message or null */
  validate?: (values: Record<string, unknown>) => string | null;
}

// ── Game type definition ─────────────────────────────────────────────────────

export interface GameType<A extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string; // e.g. "prisoner-dilemma"
  displayName: string;
  tagline: string; // one-line description shown in the game picker UI
  punchline: string; // short hook displayed under game title in UI cards
  rulesPrompt: string; // natural language rules shown to all players as context
  minPlayers: number;
  maxPlayers: number;
  horizon: Horizon;
  // Zod schema for the action tool — defines only the game-specific decision fields.
  // A `reasoning` field is prepended automatically by buildActionTool and stripped before payoff.
  actionSchema: A;
  // Keys are personaId (number). Receives one action per player per round.
  payoffFunction: (actions: Record<number, z.infer<A>>) => Record<number, number>;
  simultaneousReveal: boolean; // true = hide current-round peers' decisions until all have acted
  // Number of discussion rounds before each decision phase.
  // 0 = no discussion. Each discussion round: all players speak once in random order.
  discussionRounds: number;
  // If true: players act one-by-one in random order, seeing prior decisions in timeline
  sequential?: boolean;
  /** 1-3 line guidance shown to human players during the decision phase */
  decisionGuidance: string;
  // Human player input form config — defines field types, constraints, and auto-submit defaults
  humanInput: HumanInputConfig;
}
