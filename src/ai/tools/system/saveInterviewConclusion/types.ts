import z from "zod/v3";

export const saveInterviewConclusionInputSchema = z.object({
  conclusion: z
    .string()
    .describe(
      "Detailed interview conclusion including key findings, user insights, behavioral patterns, and memorable quotes in markdown format",
    ),
});

export const saveInterviewConclusionOutputSchema = z.object({
  id: z.number(),
  plainText: z.string(),
});

export type SaveInterviewConclusionToolResult = z.infer<
  typeof saveInterviewConclusionOutputSchema
>;
