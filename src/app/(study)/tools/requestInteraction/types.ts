import z from "zod/v3";

export const requestInteractionInputSchema = z.object({
  question: z.string().describe("Clear question asking for user input, preference, or decision"),
  options: z
    .array(z.string())
    .describe(
      "2-4 distinct answer choices for the user to select from. Selection behavior is controlled by maxSelect parameter.",
    ),
  maxSelect: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Controls selection mode: 1 = single choice (mutually exclusive options, user must pick one), 2+ = multiple choice with limit, undefined = unlimited multiple choice. IMPORTANT: Use maxSelect=1 for mutually exclusive options like 'Yes/No/Cancel' or 'Start/Modify/Cancel'.",
    ),
});

export type RequestInteractionToolInput = z.infer<typeof requestInteractionInputSchema>;

export const requestInteractionOutputSchema = z.object({
  answer: z.union([z.string(), z.array(z.string())]),
  plainText: z.string(),
});

export type RequestInteractionResult = z.infer<typeof requestInteractionOutputSchema>;
