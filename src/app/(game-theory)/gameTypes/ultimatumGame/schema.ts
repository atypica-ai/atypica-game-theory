import z from "zod/v3";

export const ultimatumGameActionSchema = z.object({
  action: z
    .enum(["propose", "accept", "reject"])
    .describe("Your action: 'propose' a split, or 'accept'/'reject' the proposal"),
  proposerShare: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .describe("If proposing: how much you keep out of 100. If responding: leave empty."),
});
