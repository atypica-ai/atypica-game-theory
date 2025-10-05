import z from "zod/v3";

export const requestInteractionInputSchema = z.object({
  question: z.string().describe("Clear question asking for user input, preference, or decision"),
  options: z
    .array(z.string())
    .describe(
      "2-4 distinct answer choices for the user to select from (users can select multiple options)",
    ),
});

export type RequestInteractionToolInput = z.infer<typeof requestInteractionInputSchema>;

export const requestInteractionOutputSchema = z.object({
  answer: z.union([z.string(), z.array(z.string())]),
  plainText: z.string(),
});

export type RequestInteractionResult = z.infer<typeof requestInteractionOutputSchema>;
