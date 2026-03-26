import z from "zod/v3";

export const prisonerDilemmaActionSchema = z.object({
  action: z
    .enum(["cooperate", "defect"])
    .describe(
      'Your choice for this round. "cooperate" means you stay silent and protect your partner. "defect" means you betray your partner to reduce your own sentence.',
    ),
  reasoning: z
    .string()
    .describe(
      "Brief explanation of your strategic reasoning (1-2 sentences). This will be revealed after all players have acted.",
    ),
});

export type PrisonerDilemmaAction = z.infer<typeof prisonerDilemmaActionSchema>;
