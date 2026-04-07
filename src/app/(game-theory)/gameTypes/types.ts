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

export interface GameType<A extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string; // e.g. "prisoner-dilemma"
  displayName: string;
  tagline: string; // one-line description shown in the game picker UI
  rulesPrompt: string; // natural language rules shown to all players as context
  minPlayers: number;
  maxPlayers: number;
  horizon: Horizon;
  // Zod schema for the action tool — must NOT include a "reasoning" field
  // (reasoning is captured from the model's native reasoning output, never as a tool parameter)
  actionSchema: A;
  // Keys are personaId (number). Receives one action per player per round.
  payoffFunction: (actions: Record<number, z.infer<A>>) => Record<number, number>;
  simultaneousReveal: boolean; // true = hide current-round peers' decisions until all have acted
  // Number of discussion rounds before each decision phase.
  // 0 = no discussion. Each discussion round: all players speak once in random order.
  discussionRounds: number;
  // If true: players act one-by-one in random order, seeing prior decisions in timeline
  sequential?: boolean;
}
