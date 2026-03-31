import z from "zod/v3";

export const beautyContestActionSchema = z.object({
  number: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe(
      "An integer from 0 to 100. You win if your number is closest to ⅔ of the group average.",
    ),
});

export type BeautyContestAction = z.infer<typeof beautyContestActionSchema>;
