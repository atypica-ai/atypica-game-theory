import z from "zod/v3";

// endInterview tool schemas
export const endInterviewInputSchema = z.object({
  memory: z
    .string()
    .describe(
      "Structured Markdown profile based on the interview, covering background, business context, goals, challenges, and key insights collected during the conversation.",
    ),
  recommendTopics: z
    .array(z.string())
    .describe(
      "2 research topic suggestions (short strings) in the user's language, based on the interview. Each topic should be concrete and compelling so the user wants to start a new study immediately.",
    ),
});

export const endInterviewOutputSchema = z.object({
  plainText: z.string(),
});

export type TContextBuilderUITools = {
  endInterview: {
    input: z.infer<typeof endInterviewInputSchema>;
    output: z.infer<typeof endInterviewOutputSchema>;
  };
};
