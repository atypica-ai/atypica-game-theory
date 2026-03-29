import z from "zod/v3";

// No "reasoning" field — reasoning is captured from the model's native thinking output.
export const stagHuntActionSchema = z.object({
  action: z
    .enum(["stag", "rabbit"])
    .describe(
      '"stag": earn 25 if enough others also choose stag (≥T players total), earn 0 if too few join. "rabbit": always earn 10, regardless of what others do.',
    ),
});

export type StagHuntAction = z.infer<typeof stagHuntActionSchema>;
