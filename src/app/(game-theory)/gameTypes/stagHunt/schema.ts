import z from "zod/v3";

// No "reasoning" field — reasoning is captured from the model's native thinking output.
export const stagHuntActionSchema = z.object({
  action: z
    .enum(["stag", "rabbit"])
    .describe(
      '"stag": earn 25 if ≥T players choose stag, earn 0 if too few join. "rabbit": always earn 10 private points; if the stag hunt also succeeds you additionally earn the 25 public benefit (35 total).',
    ),
});

export type StagHuntAction = z.infer<typeof stagHuntActionSchema>;
