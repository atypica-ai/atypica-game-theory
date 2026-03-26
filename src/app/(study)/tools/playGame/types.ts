import { generateToken } from "@/lib/utils";
import z from "zod/v3";

export const playGameInputSchema = z.object({
  gameType: z
    .string()
    .describe(
      'The game type to play. Available: "prisoner-dilemma". Each game type has its own rules, action constraints, and payoff structure.',
    ),
  personaIds: z
    .array(z.number())
    .min(2)
    .describe(
      "List of persona IDs that will participate as players. The number must match the game type's player requirements.",
    ),
  gameSessionToken: z
    .string()
    .optional()
    .describe(
      "Game session token for tracking. You don't need to provide this — the system will generate it automatically.",
    )
    .transform(() => generateToken()),
});

export type PlayGameToolInput = z.infer<typeof playGameInputSchema>;

export const playGameOutputSchema = z.object({
  gameSessionToken: z.string().describe("Token for polling the game session on the frontend"),
  plainText: z.string().describe("Tool output text for LLM reading"),
});

export type PlayGameResult = z.infer<typeof playGameOutputSchema>;
