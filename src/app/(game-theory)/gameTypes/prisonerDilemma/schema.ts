import z from "zod/v3";

// No "words" field — players in this game cannot communicate with each other.
// "reasoning" is placed first so the model commits its thought process before choosing an action.
// "reasoning" is private and never shown to other players.
export const prisonerDilemmaActionSchema = z.object({
  reasoning: z
    .string()
    .describe(
      "Your private strategic reasoning before deciding. Consider past rounds and the other player's pattern. This is never shown to the other player.",
    ),
  action: z
    .enum(["cooperate", "defect"])
    .describe(
      '"cooperate" (Choice 1): earn 51 if both cooperate, 22 if the other defects. "defect" (Choice 2): earn 63 if the other cooperates, 39 if both defect.',
    ),
});

export type PrisonerDilemmaAction = z.infer<typeof prisonerDilemmaActionSchema>;
