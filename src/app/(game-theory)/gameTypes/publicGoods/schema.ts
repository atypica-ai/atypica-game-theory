import z from "zod/v3";

export const publicGoodsActionSchema = z.object({
  contribution: z
    .number()
    .int()
    .min(0)
    .max(20)
    .describe(
      "How much to contribute to the public pool (0-20 tokens). Pool is multiplied by 1.6× and split equally. You keep what you don't contribute.",
    ),
});

export type PublicGoodsAction = z.infer<typeof publicGoodsActionSchema>;
