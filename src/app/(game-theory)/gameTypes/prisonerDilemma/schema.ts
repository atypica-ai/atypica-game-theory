import z from "zod/v3";

// No "reasoning" field — reasoning is captured from the model's native thinking output,
// not as a tool parameter. This keeps the action clean and unambiguous.
export const prisonerDilemmaActionSchema = z.object({
  action: z
    .enum(["cooperate", "defect"])
    .describe(
      '"cooperate" (Choice 1): earn 51 if both cooperate, 22 if the other defects. "defect" (Choice 2): earn 63 if the other cooperates, 39 if both defect.',
    ),
});

export type PrisonerDilemmaAction = z.infer<typeof prisonerDilemmaActionSchema>;
