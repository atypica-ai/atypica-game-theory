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
      "Controls selection mode:\n" +
        "• maxSelect=1: Single choice for mutually exclusive options (e.g., 'Yes/No', 'Start/Modify/Cancel', age ranges like '18-22/23-28/29-35')\n" +
        "• maxSelect=2+: Multiple choice with limit (e.g., maxSelect=3 for 'Select up to 3 priorities')\n" +
        "• maxSelect=undefined (or omit): Unlimited multiple choice for combinable options (e.g., 'Which features interest you?', 'Select all dimensions that apply')\n" +
        "Choose based on whether options are mutually exclusive (use 1) or can be combined (use undefined or 2+).",
    ),
});

export type RequestInteractionToolInput = z.infer<typeof requestInteractionInputSchema>;

export const requestInteractionOutputSchema = z.object({
  answer: z.union([z.string(), z.array(z.string())]),
  plainText: z.string(),
});

export type RequestInteractionResult = z.infer<typeof requestInteractionOutputSchema>;
