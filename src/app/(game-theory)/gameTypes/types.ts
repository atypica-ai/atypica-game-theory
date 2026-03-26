import z from "zod/v3";
import { GameSessionTimeline } from "../types";

// Horizon / termination condition — part of the game's mathematical definition
export type Horizon =
  | { type: "fixed"; rounds: number }
  | {
      type: "condition";
      description: string; // natural language description shown to players
      shouldTerminate: (timeline: GameSessionTimeline) => boolean;
    }
  | {
      type: "indefinite";
      discountFactor: number; // e.g. 0.9 — δ-discounted payoffs
      maxRounds: number; // safety cap
    };

export interface GameType<A extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string; // e.g. "prisoner-dilemma"
  displayName: string;
  rulesPrompt: string; // natural language rules shown to all players as context
  minPlayers: number;
  maxPlayers: number;
  horizon: Horizon;
  actionSchema: A; // Zod schema — defines the action tool parameters per round
  payoffFunction: (actions: Record<string, z.infer<A>>) => Record<string, number>;
  simultaneousReveal: boolean; // true = hide current-round peers' actions until all have acted
}
